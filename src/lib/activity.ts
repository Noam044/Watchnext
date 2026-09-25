import "server-only";
import { prisma } from "@/lib/db";
import { friendIds } from "@/lib/friends";

const filmCard = { id: true, tmdbId: true, title: true, year: true, posterPath: true } as const;

/** Dernières séances des amis : les visionnages datés de leur journal, du plus récent au plus ancien. */
export async function getFriendsActivity(userId: string, take = 12) {
  const ids = await friendIds(userId);
  if (ids.length === 0) return [];
  return prisma.userFilm.findMany({
    where: { userId: { in: ids }, watched: true, watchedAt: { not: null } },
    orderBy: [{ watchedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      rating: true,
      liked: true,
      watchedAt: true,
      review: true,
      reviewSpoilers: true,
      film: { select: filmCard },
      user: { select: { name: true, handle: true } },
    },
    take,
  });
}

/** Dernières entrées datées du journal d'un utilisateur. */
export function getRecentDiary(userId: string, take = 6) {
  return prisma.userFilm.findMany({
    where: { userId, watched: true, watchedAt: { not: null } },
    orderBy: [{ watchedAt: "desc" }, { updatedAt: "desc" }],
    select: { id: true, rating: true, liked: true, watchedAt: true, review: true, film: { select: filmCard } },
    take,
  });
}

/** Films échangés dans les conversations, chacun une seule fois (le partage le plus récent). */
export async function getSharedFilms(userId: string, take = 8) {
  const rows = await prisma.message.findMany({
    where: { filmId: { not: null }, OR: [{ senderId: userId }, { recipientId: userId }] },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      senderId: true,
      film: { select: filmCard },
      sender: { select: { name: true, handle: true } },
      recipient: { select: { name: true, handle: true } },
    },
    take: 60,
  });
  const seen = new Set<string>();
  return rows
    .filter((r) => r.film && !seen.has(r.film.id) && seen.add(r.film.id))
    .slice(0, take)
    .map((r) => ({ ...r, film: r.film!, fromMe: r.senderId === userId }));
}

/** Imports d'export Letterboxd, du plus récent au plus ancien. */
export function getImportHistory(userId: string, take = 6) {
  return prisma.importJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, fileName: true, total: true, matched: true, createdAt: true, finishedAt: true },
    take,
  });
}

/**
 * Autres films connus du même réalisateur, avec ce que l'utilisateur en a pensé.
 * La base ne contient que les films déjà croisés par Watchnext : la liste n'est pas une filmographie complète.
 */
export async function getSameDirector(filmId: string, directorId: number, userId: string, take = 10) {
  const films = await prisma.film.findMany({
    where: { id: { not: filmId }, directors: { array_contains: [{ id: directorId }] } },
    select: { ...filmCard, userFilms: { where: { userId }, select: { watched: true, rating: true, liked: true } } },
    orderBy: [{ year: { sort: "desc", nulls: "last" } }],
    take: 40,
  });
  // Les films vus d'abord, puis les autres ; par année décroissante dans chaque groupe.
  return films
    .map(({ userFilms, ...film }) => ({ ...film, mine: userFilms[0] ?? null }))
    .sort((a, b) => Number(!!b.mine?.watched) - Number(!!a.mine?.watched))
    .slice(0, take);
}
