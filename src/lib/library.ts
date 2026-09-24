import "server-only";
import { prisma } from "@/lib/db";

export type IncomingFilm = {
  watched: boolean;
  inWatchlist: boolean;
  rating: number | null;
  liked: boolean;
  watchedAt: Date | null;
};

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
    rating: inc.rating ?? old?.rating ?? null,
    liked: (old?.liked ?? false) || inc.liked,
    watchedAt: maxDate(old?.watchedAt ?? null, inc.watchedAt),
  };
  const changed =
    !old ||
    old.watched !== data.watched ||
    old.inWatchlist !== data.inWatchlist ||
    old.rating !== data.rating ||
    old.liked !== data.liked ||
    old.watchedAt?.getTime() !== data.watchedAt?.getTime();
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
