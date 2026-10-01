import "server-only";
import { prisma } from "@/lib/db";

export type IncomingFilm = {
  watched: boolean;
  inWatchlist: boolean;
  rating: number | null;
  /** Date de la note (visionnage qui la porte, ou date de ratings.csv). */
  ratedAt?: Date | null;
  liked: boolean;
  watchedAt: Date | null;
  review?: string | null;
  reviewSpoilers?: boolean;
  /** Date de la critique (date de visionnage de l'entrée qui la porte). */
  reviewedAt?: Date | null;
};

/** La critique la plus récente l'emporte ; sans date, une nouvelle critique remplace l'ancienne. */
function pickReview(
  old: { review: string | null; reviewSpoilers: boolean; reviewedAt: Date | null } | null,
  inc: IncomingFilm,
) {
  const keep = { review: old?.review ?? null, reviewSpoilers: old?.reviewSpoilers ?? false, reviewedAt: old?.reviewedAt ?? null };
  if (!inc.review) return keep;
  const incAt = inc.reviewedAt ?? null;
  if (old?.review && old.reviewedAt && incAt && incAt < old.reviewedAt) return keep;
  return { review: inc.review, reviewSpoilers: inc.reviewSpoilers ?? false, reviewedAt: incAt ?? old?.reviewedAt ?? null };
}

/**
 * La note la plus récente l'emporte : réimporter un vieil export n'écrase pas une note plus
 * récente venue du flux RSS. Sans date, une nouvelle note remplace l'ancienne.
 */
function pickRating(old: { rating: number | null; ratedAt: Date | null } | null, inc: IncomingFilm) {
  const keep = { rating: old?.rating ?? null, ratedAt: old?.ratedAt ?? null };
  if (inc.rating == null) return keep;
  const incAt = inc.ratedAt ?? null;
  if (old?.rating != null && old.ratedAt && incAt && incAt < old.ratedAt) return keep;
  return { rating: inc.rating, ratedAt: incAt ?? old?.ratedAt ?? null };
}

function maxDate(a: Date | null, b: Date | null) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

/**
 * Fusionne une entrée importée avec la bibliothèque existante, sans doublon
 * (contrainte unique userId + filmId). La donnée la plus riche l'emporte.
 */
export async function mergeUserFilm(userId: string, filmId: string, inc: IncomingFilm) {
  const old = await prisma.userFilm.findUnique({ where: { userId_filmId: { userId, filmId } } });
  const watched = (old?.watched ?? false) || inc.watched;
  const data = {
    watched,
    // Letterboxd retire un film de la watchlist quand il est vu.
    inWatchlist: !watched && ((old?.inWatchlist ?? false) || inc.inWatchlist),
    ...pickRating(old, inc),
    liked: (old?.liked ?? false) || inc.liked,
    watchedAt: maxDate(old?.watchedAt ?? null, inc.watchedAt),
    ...pickReview(old, inc),
  };
  const changed =
    !old ||
    old.watched !== data.watched ||
    old.inWatchlist !== data.inWatchlist ||
    old.rating !== data.rating ||
    old.ratedAt?.getTime() !== data.ratedAt?.getTime() ||
    old.liked !== data.liked ||
    old.watchedAt?.getTime() !== data.watchedAt?.getTime() ||
    old.review !== data.review ||
    old.reviewSpoilers !== data.reviewSpoilers;
  const uf = changed
    ? await prisma.userFilm.upsert({
        where: { userId_filmId: { userId, filmId } },
        create: { userId, filmId, ...data },
        update: data,
      })
    : old;
  // Un film vu ne doit plus être recommandé.
  if (watched && changed) await prisma.recommendation.deleteMany({ where: { userId, filmId, hidden: false } });
  return { userFilm: uf, changed };
}
