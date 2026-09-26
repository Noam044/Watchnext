import "server-only";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createLimiter } from "@/lib/limit";
import type { Prisma } from "@/generated/prisma/client";

// Surchargeable pour les tests (serveur TMDB factice) ou un proxy.
const API = process.env.TMDB_API_BASE?.replace(/\/$/, "") || "https://api.themoviedb.org/3";

const DAY = 24 * 60 * 60 * 1000;

// TMDB tolère ~40 req/s ; on reste prudent au niveau du process.
const limit = createLimiter(8);

export type TmdbMovieListItem = {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  overview?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  adult?: boolean;
  original_language?: string;
};

export type TmdbPage = {
  page: number;
  results: TmdbMovieListItem[];
  total_pages: number;
  total_results: number;
};

export type TmdbMovieDetails = Omit<TmdbMovieListItem, "genre_ids"> & {
  runtime: number | null;
  genres: { id: number; name: string }[];
  credits?: {
    cast: { id: number; name: string; order: number }[];
    crew: { id: number; name: string; job: string }[];
  };
  keywords?: { keywords: { id: number; name: string }[] };
  "watch/providers"?: { results?: Record<string, TmdbRegionProviders> };
  translations?: {
    translations: { iso_639_1: string; iso_3166_1: string; data?: { title?: string; overview?: string } }[];
  };
};

type TmdbProvider = { provider_id: number; provider_name: string; logo_path: string | null; display_priority?: number };
export type TmdbRegionProviders = {
  link?: string;
  flatrate?: TmdbProvider[];
  free?: TmdbProvider[];
  ads?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
};

function apiKey() {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) {
    throw new AppError("TMDB_AUTH", "tmdbKeyMissing", {}, 500);
  }
  return key;
}

export function language() {
  return process.env.TMDB_LANGUAGE?.trim() || "fr-FR";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Appel brut à TMDB avec gestion du quota (429 + Retry-After), des erreurs
 * d'authentification et des pannes réseau. Retourne null pour un 404.
 */
async function request<T>(path: string, params: Record<string, string | number | undefined>): Promise<T | null> {
  const key = apiKey();
  const url = new URL(API + path);
  const headers: Record<string, string> = { accept: "application/json" };
  // Jeton v4 (JWT) -> Bearer, sinon clé v3 en query string.
  if (key.startsWith("eyJ")) headers.authorization = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    let res: Response;
    try {
      res = await limit(() => fetch(url, { headers, signal: AbortSignal.timeout(10_000), cache: "no-store" }));
    } catch {
      if (attempt < 2) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      throw new AppError("TMDB_UNAVAILABLE", "tmdbUnavailable", {}, 503);
    }

    if (res.ok) return (await res.json()) as T;
    if (res.status === 404) return null;
    if (res.status === 401) {
      throw new AppError("TMDB_AUTH", "tmdbKeyInvalid", {}, 500);
    }
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after")) || 2 ** attempt;
      if (attempt < 3 && retryAfter <= 10) {
        await sleep(retryAfter * 1000);
        continue;
      }
      throw new AppError("TMDB_QUOTA", "tmdbQuota", {}, 429);
    }
    if (res.status >= 500 && attempt < 2) {
      await sleep(800 * (attempt + 1));
      continue;
    }
    throw new AppError("TMDB_UNAVAILABLE", "tmdbStatus", { status: res.status }, 502);
  }
  throw new AppError("TMDB_UNAVAILABLE", "tmdbUnavailable", {}, 503);
}

/** Appel TMDB mis en cache dans la table TmdbCache. */
async function cached<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  ttlMs: number,
): Promise<T | null> {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const key = `${path}?${sorted}`;

  const hit = await prisma.tmdbCache.findUnique({ where: { key } });
  if (hit && hit.expiresAt > new Date()) return hit.data as T | null;

  const data = await request<T>(path, params);
  const json = (data ?? null) as Prisma.InputJsonValue;
  const expiresAt = new Date(Date.now() + (data ? ttlMs : DAY));
  await prisma.tmdbCache.upsert({
    where: { key },
    create: { key, data: json ?? {}, expiresAt },
    update: { data: json ?? {}, expiresAt },
  });
  return data;
}

export async function searchMovie(query: string, opts: { year?: number; primaryYear?: boolean } = {}) {
  const params: Record<string, string | number | undefined> = {
    query,
    language: language(),
    include_adult: "false",
  };
  if (opts.year) params[opts.primaryYear ? "primary_release_year" : "year"] = opts.year;
  const page = await cached<TmdbPage>("/search/movie", params, 30 * DAY);
  return page?.results ?? [];
}

export async function getRecommendations(tmdbId: number) {
  const page = await cached<TmdbPage>(`/movie/${tmdbId}/recommendations`, { language: language(), page: 1 }, 7 * DAY);
  return page?.results ?? [];
}

export async function getSimilar(tmdbId: number) {
  const page = await cached<TmdbPage>(`/movie/${tmdbId}/similar`, { language: language(), page: 1 }, 7 * DAY);
  return page?.results ?? [];
}

export async function discover(params: Record<string, string | number | undefined>) {
  const page = await cached<TmdbPage>(
    "/discover/movie",
    { language: language(), include_adult: "false", include_video: "false", ...params },
    2 * DAY,
  );
  return page?.results ?? [];
}

export async function getGenreMap(lang = language()): Promise<Map<number, string>> {
  const res = await cached<{ genres: { id: number; name: string }[] }>(
    "/genre/movie/list",
    { language: lang },
    30 * DAY,
  );
  return new Map((res?.genres ?? []).map((g) => [g.id, g.name]));
}

/** Films populaires de la semaine (page d'accueil), dans la langue demandée. */
export async function trending(lang = language()) {
  const page = await cached<TmdbPage>("/trending/movie/week", { language: lang }, DAY);
  return page?.results ?? [];
}

type TmdbVideo = {
  key: string;
  site: string;
  type: string;
  official: boolean;
  iso_639_1: string | null;
  size?: number;
};

/**
 * Clé YouTube de la bande-annonce à montrer : en français si possible, sinon en anglais,
 * en préférant les bandes-annonces officielles aux teasers. Réponse mise en cache 7 jours.
 */
export async function getTrailerKey(tmdbId: number): Promise<string | null> {
  const lang = language();
  const res = await cached<{ results: TmdbVideo[] }>(
    `/movie/${tmdbId}/videos`,
    { language: lang, include_video_language: `${lang.slice(0, 2)},en,null` },
    7 * DAY,
  );
  const videos = (res?.results ?? []).filter(
    (v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"),
  );
  const score = (v: TmdbVideo) =>
    (v.iso_639_1 === lang.slice(0, 2) ? 8 : v.iso_639_1 === "en" ? 4 : 0) +
    (v.type === "Trailer" ? 2 : 0) +
    (v.official ? 1 : 0);
  return videos.sort((a, b) => score(b) - score(a))[0]?.key ?? null;
}

/**
 * Détails complets, avec les offres de streaming de chaque pays et les traductions (titre et synopsis anglais)
 * (non mis en cache ici : stockés dans la table Film).
 */
export function getMovieDetails(tmdbId: number) {
  return request<TmdbMovieDetails>(`/movie/${tmdbId}`, {
    language: language(),
    append_to_response: "credits,keywords,watch/providers,translations",
  });
}

/**
 * Plateformes disponibles dans un pays, des plus répandues aux plus confidentielles
 * (liste JustWatch via TMDB, mise en cache 7 jours).
 */
export async function getProviderCatalog(region: string) {
  const res = await cached<{
    results: (TmdbProvider & { display_priorities?: Record<string, number> })[];
  }>("/watch/providers/movie", { language: language(), watch_region: region }, 7 * DAY);
  return (res?.results ?? [])
    .map((p) => ({
      id: p.provider_id,
      name: p.provider_name,
      logo: p.logo_path,
      rank: p.display_priorities?.[region] ?? p.display_priority ?? 999,
    }))
    .sort((a, b) => a.rank - b.rank);
}
