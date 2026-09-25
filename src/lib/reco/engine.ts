import "server-only";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ensureManyDetails, refs, upsertListItems } from "@/lib/films";
import { mapLimit } from "@/lib/limit";
import { formatList } from "@/lib/text";
import { discover, getRecommendations, getSimilar, type TmdbMovieListItem } from "@/lib/tmdb";
import {
  buildProfile,
  featureKey,
  filmFeatures,
  filmWeight,
  profileSimilarity,
  type FeatureType,
  type TasteProfile,
} from "@/lib/reco/profile";
import type { Film, Prisma } from "@/generated/prisma/client";

const MIN_VOTES = 150;
const SEED_COUNT = 12;
const DETAILED_CANDIDATES = 80;
const RESULT_COUNT = 40;
const MIN_WATCHED = 3;

type Source = "recommendations" | "similar" | "discover" | "watchlist";

type Candidate = {
  item: TmdbMovieListItem | null;
  film?: Film;
  /** Films aimés qui ont mené à ce candidat (recommendations / similar), avec leur poids. */
  seeds: Map<number, number>;
  support: number;
  sources: Set<Source>;
  inWatchlist: boolean;
};

export type RecoDetails = {
  pct: number;
  profile: number;
  quality: number;
  support: number;
  parts: Record<FeatureType, number>;
  tags: string[];
  because: string[];
};

/** Note pondérée "à la IMDb" : tire les films peu votés vers la moyenne. */
function bayesian(voteAverage: number, voteCount: number, m = 400, c = 6.4) {
  return (voteCount / (voteCount + m)) * voteAverage + (m / (voteCount + m)) * c;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const today = () => new Date().toISOString().slice(0, 10);

export async function generateRecommendations(userId: string) {
  // 1. Bibliothèque de l'utilisateur
  const library = await prisma.userFilm.findMany({ where: { userId }, include: { film: true } });
  const watched = library.filter((uf) => uf.watched);
  if (watched.length < MIN_WATCHED) {
    throw new AppError("NOT_ENOUGH_DATA", "notEnoughData", { min: MIN_WATCHED });
  }

  // Les films les plus influents doivent avoir leurs détails (réalisateurs, mots-clés…).
  const influential = [...watched]
    .sort((a, b) => Math.abs(filmWeight(b)) - Math.abs(filmWeight(a)))
    .slice(0, 150)
    .filter((uf) => !uf.film.detailsFetchedAt)
    .map((uf) => uf.film.tmdbId);
  const refreshed = await ensureManyDetails(influential);

  const rated = watched.map((uf) => ({
    uf,
    film: refreshed.get(uf.film.tmdbId) ?? uf.film,
    weight: filmWeight(uf),
  }));
  const profile = buildProfile(rated);

  const watchedIds = new Set(watched.map((uf) => uf.film.tmdbId));
  const watchlistIds = new Set(library.filter((uf) => uf.inWatchlist && !uf.watched).map((uf) => uf.film.tmdbId));
  const hidden = await prisma.recommendation.findMany({
    where: { userId, hidden: true },
    select: { film: { select: { tmdbId: true } } },
  });
  const excluded = new Set([...watchedIds, ...hidden.map((h) => h.film.tmdbId)]);

  // 2. Génération des candidats
  const candidates = new Map<number, Candidate>();
  const addCandidate = (
    item: TmdbMovieListItem | null,
    tmdbId: number,
    source: Source,
    seed?: { tmdbId: number; weight: number },
  ) => {
    if (excluded.has(tmdbId) || item?.adult) return;
    let c = candidates.get(tmdbId);
    if (!c) {
      c = { item, seeds: new Map(), support: 0, sources: new Set(), inWatchlist: watchlistIds.has(tmdbId) };
      candidates.set(tmdbId, c);
    }
    c.item ??= item;
    c.sources.add(source);
    if (seed) {
      const w = seed.weight * (source === "similar" ? 0.6 : 1);
      c.seeds.set(seed.tmdbId, Math.max(c.seeds.get(seed.tmdbId) ?? 0, w));
      c.support += w;
    }
  };

  // Graines : films les mieux notés, en favorisant les visionnages récents.
  const now = Date.now();
  const seeds = rated
    .filter((r) => r.weight >= 0.45)
    .map((r) => {
      const ageYears = r.uf.watchedAt ? (now - r.uf.watchedAt.getTime()) / (365 * 864e5) : 5;
      return { ...r, priority: r.weight * (1 + 0.5 * Math.exp(-ageYears / 2)) + Math.random() * 0.15 };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, SEED_COUNT);

  await mapLimit(seeds, 4, async (s) => {
    const [recs, sims] = await Promise.all([getRecommendations(s.film.tmdbId), getSimilar(s.film.tmdbId)]);
    for (const it of recs) addCandidate(it, it.id, "recommendations", { tmdbId: s.film.tmdbId, weight: s.weight });
    for (const it of sims) addCandidate(it, it.id, "similar", { tmdbId: s.film.tmdbId, weight: s.weight });
  });

  // /discover : genres, réalisateurs et mots-clés favoris.
  const topGenres = profile.top.genre.slice(0, 3).map((g) => g.id);
  const topDirectors = profile.top.director.slice(0, 3).map((d) => d.id);
  const topKeywords = profile.top.keyword.slice(0, 5).map((k) => k.id);
  const discoverQueries: Record<string, string | number>[] = [];
  const base = { sort_by: "vote_average.desc", "vote_count.gte": 400, "release_date.lte": today() };
  for (const g of topGenres) discoverQueries.push({ ...base, with_genres: g });
  if (topGenres.length >= 2) {
    discoverQueries.push({ ...base, with_genres: `${topGenres[0]},${topGenres[1]}`, page: 2 });
    discoverQueries.push({ ...base, sort_by: "popularity.desc", with_genres: `${topGenres[0]},${topGenres[1]}` });
  }
  if (topDirectors.length) {
    discoverQueries.push({ ...base, "vote_count.gte": 80, with_crew: topDirectors.join("|") });
  }
  if (topKeywords.length) {
    discoverQueries.push({ ...base, "vote_count.gte": 200, with_keywords: topKeywords.join("|") });
  }
  await mapLimit(discoverQueries, 4, async (q) => {
    for (const it of await discover(q)) addCandidate(it, it.id, "discover");
  });

  // La watchlist fait partie des candidats (avec un léger bonus plus bas).
  for (const id of watchlistIds) addCandidate(null, id, "watchlist");

  // 3. Filtrage (votes minimum, films sortis) et pré-score sur les données "liste"
  const listItems = [...candidates.values()].flatMap((c) => (c.item ? [c.item] : []));
  const films = await upsertListItems(listItems);
  for (const [id, c] of candidates) c.film = films.get(id) ?? library.find((uf) => uf.film.tmdbId === id)?.film;

  const pool = [...candidates.entries()].filter(([, c]) => {
    const f = c.film;
    if (!f) return false;
    if (f.releaseDate && f.releaseDate > today()) return false;
    return c.inWatchlist ? f.voteCount >= 20 : f.voteCount >= MIN_VOTES;
  });

  const preScored = pool
    .map(([id, c]) => {
      const sim = profileSimilarity(profile, filmFeatures(c.film!)).score;
      return { id, c, pre: sim * 0.5 + quality(c.film!) * 0.3 + supportScore(c.support) * 0.3 };
    })
    .sort((a, b) => b.pre - a.pre)
    .slice(0, DETAILED_CANDIDATES);

  // 4. Détails complets pour les meilleurs candidats, puis score final
  const detailed = await ensureManyDetails(preScored.map((p) => p.id));
  const seedFilms = new Map(rated.map((r) => [r.film.tmdbId, r]));

  const scored = preScored.map(({ id, c }) => {
    const film = detailed.get(id) ?? c.film!;
    const features = filmFeatures(film);
    const sim = profileSimilarity(profile, features);
    const q = quality(film);
    const sup = supportScore(c.support);
    const score = 0.55 * sim.score + 0.25 * q + 0.2 * sup + (c.inWatchlist ? 0.08 : 0);
    const { reason, details } = explain(film, c, profile, rated, seedFilms);
    return {
      film,
      score,
      reason,
      details: { ...details, profile: sim.score, quality: q, support: sup, parts: sim.parts, pct: toPct(score) },
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = diversify(scored).slice(0, RESULT_COUNT);

  // 5. Persistance : on remplace les recommandations visibles, les masquées restent masquées.
  await prisma.$transaction([
    prisma.recommendation.deleteMany({ where: { userId, hidden: false } }),
    prisma.recommendation.createMany({
      data: top.map((r) => ({
        userId,
        filmId: r.film.id,
        score: r.score,
        reason: r.reason,
        details: r.details as unknown as Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
    }),
  ]);

  return { count: top.length, candidates: candidates.size };
}

function quality(f: Pick<Film, "voteAverage" | "voteCount">) {
  return clamp01((bayesian(f.voteAverage, f.voteCount) - 5.5) / 2.5);
}

function supportScore(support: number) {
  return clamp01(Math.log2(1 + Math.max(0, support)) / 2.5);
}

/** Score brut (~[-0.5, 1.1]) → pourcentage d'affinité lisible. */
function toPct(score: number) {
  return Math.round(100 / (1 + Math.exp(-6 * (score - 0.35))));
}

/** Évite qu'un même réalisateur monopolise le haut de la liste (max 3). */
function diversify<T extends { film: Film }>(list: T[]) {
  const perDirector = new Map<number, number>();
  return list.filter(({ film }) => {
    const d = refs(film.directors)[0];
    if (!d) return true;
    const n = (perDirector.get(d.id) ?? 0) + 1;
    perDirector.set(d.id, n);
    return n <= 3;
  });
}

/** Construit l'explication : « Parce que tu as aimé X et Y » + étiquettes. */
function explain(
  film: Film,
  c: Candidate,
  profile: TasteProfile,
  rated: { film: Film; weight: number }[],
  seedFilms: Map<number, { film: Film; weight: number }>,
) {
  let because: string[];
  if (c.seeds.size > 0) {
    because = [...c.seeds.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id]) => seedFilms.get(id)!.film.title);
  } else {
    // Pas de graine directe : on cherche les films aimés les plus proches.
    const cand = filmFeatures(film);
    const weights: Record<FeatureType, number> = { director: 3, cast: 1.2, keyword: 1, genre: 0.3, decade: 0.1 };
    const candKeys = new Map(cand.map((f) => [featureKey(f), weights[f.type]]));
    because = rated
      .filter((r) => r.weight >= 0.45)
      .map((r) => ({
        title: r.film.title,
        overlap: filmFeatures(r.film).reduce((s, f) => s + (candKeys.get(featureKey(f)) ?? 0), 0) * r.weight,
      }))
      .filter((r) => r.overlap >= 1.5)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 2)
      .map((r) => r.title);
  }

  const tags: string[] = [];
  const director = refs(film.directors).find((d) => (profile.affinity.get(`director:${d.id}`) ?? 0) > 0.25);
  if (director) tags.push(`Réalisé par ${director.name}`);
  const actor = refs(film.cast)
    .slice(0, 5)
    .find((a) => (profile.affinity.get(`cast:${a.id}`) ?? 0) > 0.35 && (profile.counts.get(`cast:${a.id}`) ?? 0) >= 2);
  if (actor) tags.push(`Avec ${actor.name}`);
  if (c.inWatchlist) tags.push("Dans ta watchlist");
  const genres = refs(film.genres)
    .filter((g) => (profile.affinity.get(`genre:${g.id}`) ?? 0) > 0.4)
    .slice(0, 2)
    .map((g) => g.name);
  if (!tags.length && genres.length) tags.push(genres.join(" · "));

  let reason: string;
  if (because.length) reason = `Parce que tu as aimé ${formatList(because)}`;
  else if (director) reason = `Parce que tu apprécies les films de ${director.name}`;
  else if (c.inWatchlist) reason = "Dans ta watchlist et proche de tes goûts";
  else if (genres.length) reason = `Correspond à ton goût pour ${formatList(genres.map((g) => g.toLowerCase()))}`;
  else reason = "Très bien noté et proche de tes goûts";

  return { reason, details: { tags, because } };
}
