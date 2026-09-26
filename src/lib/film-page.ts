import "server-only";
import { prisma } from "@/lib/db";
import { ensureFilmDetails } from "@/lib/films";
import { friendIds } from "@/lib/friends";

/**
 * Tout ce qu'affiche la fiche d'un film pour un utilisateur : le film (récupéré sur
 * TMDB s'il n'est pas encore en base), son avis, sa recommandation éventuelle et les
 * avis de ses amis (seuls les amis voient les notes et critiques les uns des autres).
 */
export async function getFilmPage(tmdbId: number, viewerId: string) {
  const film = await ensureFilmDetails(tmdbId, true);
  if (!film) return null;
  const ids = await friendIds(viewerId);
  const [mine, reco, friends] = await Promise.all([
    prisma.userFilm.findUnique({ where: { userId_filmId: { userId: viewerId, filmId: film.id } } }),
    prisma.recommendation.findUnique({ where: { userId_filmId: { userId: viewerId, filmId: film.id } } }),
    ids.length
      ? prisma.userFilm.findMany({
          where: { filmId: film.id, userId: { in: ids }, OR: [{ watched: true }, { inWatchlist: true }] },
          include: { user: { select: { id: true, name: true, handle: true, avatarAt: true } } },
          orderBy: [{ review: { sort: "asc", nulls: "last" } }, { rating: { sort: "desc", nulls: "last" } }],
        })
      : [],
  ]);
  return { film, mine, reco: reco && !reco.hidden ? reco : null, friends };
}
