import "server-only";
import { prisma } from "@/lib/db";
import { mapLimit } from "@/lib/limit";
import { WATCH_REGIONS, type FilmProviders } from "@/lib/providers";
import { normalizeTitle } from "@/lib/text";
import {
  getGenreMap,
  getMovieDetails,
  searchMovie,
  type TmdbMovieDetails,
  type TmdbMovieListItem,
  type TmdbRegionProviders,
} from "@/lib/tmdb";
import type { Film, Prisma } from "@/generated/prisma/client";

export type NamedRef = { id: number; name: string };

const DAY = 24 * 60 * 60 * 1000;
const DETAILS_TTL = 30 * DAY;
/** Les offres de streaming changent souvent : elles sont rafraîchies chaque semaine. */
const PROVIDERS_TTL = 7 * DAY;
const MAX_CAST = 6;
const MAX_KEYWORDS = 25;

function yearOf(date?: string | null) {
  const y = date ? Number(date.slice(0, 4)) : NaN;
  return Number.isFinite(y) && y > 1800 ? y : null;
}

function listData(item: TmdbMovieListItem) {
  return {
    title: item.title,
    originalTitle: item.original_title ?? null,
    year: yearOf(item.release_date),
    releaseDate: item.release_date || null,
    overview: item.overview || null,
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path ?? null,
    voteAverage: item.vote_average ?? 0,
    voteCount: item.vote_count ?? 0,
    popularity: item.popularity ?? 0,
    originalLanguage: item.original_language ?? null,
  };
}

/** Offres des pays proposés dans l'app, réduites aux identifiants de fournisseurs. */
function providersData(results: Record<string, TmdbRegionProviders> | undefined): FilmProviders {
  const ids = (...lists: (TmdbRegionProviders["flatrate"] | undefined)[]) => [
    ...new Set(lists.flatMap((l) => (l ?? []).map((p) => p.provider_id))),
  ];
  const out: FilmProviders = {};
  for (const region of WATCH_REGIONS) {
    const r = results?.[region];
    if (!r) continue;
    out[region] = { link: r.link, stream: ids(r.flatrate, r.free, r.ads), rent: ids(r.rent), buy: ids(r.buy) };
  }
  return out;
}

/**
 * Enregistre (ou met à jour) des films à partir de résultats "liste" TMDB
 * (search, discover, recommendations…). Ne touche pas aux champs de détails.
 */
export async function upsertListItems(items: TmdbMovieListItem[]): Promise<Map<number, Film>> {
  const unique = [...new Map(items.map((i) => [i.id, i])).values()];
  const out = new Map<number, Film>();
  if (unique.length === 0) return out;

  const genreMap = await getGenreMap();
  const existing = await prisma.film.findMany({ where: { tmdbId: { in: unique.map((i) => i.id) } } });
  const byId = new Map(existing.map((f) => [f.tmdbId, f]));

  const missing = unique.filter((i) => !byId.has(i.id));
  if (missing.length) {
    await prisma.film.createMany({
      data: missing.map((i) => ({
        tmdbId: i.id,
        ...listData(i),
        genres: (i.genre_ids ?? []).map((id) => ({ id, name: genreMap.get(id) ?? "" })),
      })),
      skipDuplicates: true,
    });
    const created = await prisma.film.findMany({ where: { tmdbId: { in: missing.map((i) => i.id) } } });
    for (const f of created) byId.set(f.tmdbId, f);
  }

  for (const [id, f] of byId) out.set(id, f);
  return out;
}

function detailsData(d: TmdbMovieDetails) {
  const crew = d.credits?.crew ?? [];
  const cast = [...(d.credits?.cast ?? [])].sort((a, b) => a.order - b.order);
  return {
    title: d.title,
    originalTitle: d.original_title ?? null,
    year: yearOf(d.release_date),
    releaseDate: d.release_date || null,
    overview: d.overview || null,
    posterPath: d.poster_path,
    backdropPath: d.backdrop_path ?? null,
    runtime: d.runtime ?? null,
    voteAverage: d.vote_average ?? 0,
    voteCount: d.vote_count ?? 0,
    popularity: d.popularity ?? 0,
    genres: d.genres.map((g) => ({ id: g.id, name: g.name })),
    directors: crew.filter((c) => c.job === "Director").map((c) => ({ id: c.id, name: c.name })),
    cast: cast.slice(0, MAX_CAST).map((c) => ({ id: c.id, name: c.name })),
    keywords: (d.keywords?.keywords ?? []).slice(0, MAX_KEYWORDS).map((k) => ({ id: k.id, name: k.name })),
    originalLanguage: d.original_language ?? null,
    providers: providersData(d["watch/providers"]?.results) as Prisma.InputJsonValue,
    providersAt: new Date(),
    detailsFetchedAt: new Date(),
  };
}

function isFresh(f: Film | null | undefined, withProviders = false) {
  if (!f?.detailsFetchedAt || Date.now() - f.detailsFetchedAt.getTime() >= DETAILS_TTL) return false;
  return !withProviders || (!!f.providersAt && Date.now() - f.providersAt.getTime() < PROVIDERS_TTL);
}

/** Les offres de streaming du film sont-elles à rafraîchir (inconnues ou vieilles d'une semaine) ? */
export function providersStale(f: Pick<Film, "providersAt">) {
  return !f.providersAt || Date.now() - f.providersAt.getTime() >= PROVIDERS_TTL;
}

/**
 * Garantit que le film existe en base avec ses détails (genres, équipe, mots-clés),
 * et, avec `withProviders`, des offres de streaming de moins d'une semaine.
 */
export async function ensureFilmDetails(tmdbId: number, withProviders = false): Promise<Film | null> {
  const existing = await prisma.film.findUnique({ where: { tmdbId } });
  if (isFresh(existing, withProviders)) return existing;

  const d = await getMovieDetails(tmdbId);
  if (!d) return existing; // 404 TMDB : on garde ce qu'on a
  const data = detailsData(d);
  return prisma.film.upsert({ where: { tmdbId }, create: { tmdbId, ...data }, update: data });
}

/** Version groupée : ne récupère que les films sans détails frais (ni offres fraîches, avec `withProviders`). */
export async function ensureManyDetails(
  tmdbIds: number[],
  concurrency = 6,
  withProviders = false,
): Promise<Map<number, Film>> {
  const ids = [...new Set(tmdbIds)];
  const existing = await prisma.film.findMany({ where: { tmdbId: { in: ids } } });
  const out = new Map(existing.map((f) => [f.tmdbId, f]));
  const toFetch = ids.filter((id) => !isFresh(out.get(id), withProviders));
  await mapLimit(toFetch, concurrency, async (id) => {
    const f = await ensureFilmDetails(id, withProviders);
    if (f) out.set(id, f);
  });
  return out;
}

function pickBest(results: TmdbMovieListItem[], title: string, year: number | null, strictYear: boolean) {
  if (results.length === 0) return null;
  const norm = normalizeTitle(title);
  const titleMatches = (r: TmdbMovieListItem) =>
    normalizeTitle(r.title) === norm || (r.original_title && normalizeTitle(r.original_title) === norm);
  const yearDiff = (r: TmdbMovieListItem) => {
    const y = yearOf(r.release_date);
    return year && y ? Math.abs(y - year) : 99;
  };

  const exact = results.filter(titleMatches);
  if (strictYear) {
    return exact.find((r) => yearDiff(r) <= 1) ?? results.find((r) => yearDiff(r) <= 1) ?? null;
  }
  return exact.sort((a, b) => yearDiff(a) - yearDiff(b) || b.vote_count - a.vote_count)[0] ?? results[0];
}

/**
 * Retrouve l'identifiant TMDB d'un film Letterboxd à partir du titre et de l'année.
 * Stratégie : année de sortie principale -> n'importe quelle date de sortie -> sans année (±1 an).
 */
export async function matchFilm(title: string, year: number | null): Promise<TmdbMovieListItem | null> {
  if (year) {
    const primary = await searchMovie(title, { year, primaryYear: true });
    const best = pickBest(primary, title, year, false);
    if (best) return best;

    const anyRelease = await searchMovie(title, { year });
    const best2 = pickBest(anyRelease, title, year, false);
    if (best2) return best2;
  }
  const loose = await searchMovie(title);
  return pickBest(loose, title, year, !!year);
}

export function refs(json: unknown): NamedRef[] {
  return Array.isArray(json) ? (json as NamedRef[]) : [];
}
