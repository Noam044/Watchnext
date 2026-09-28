import "server-only";
import { prisma } from "@/lib/db";
import { refs } from "@/lib/films";
import { closestLiked, quality, toPct } from "@/lib/reco/engine";
import { buildProfile, filmFeatures, filmWeight, profileSimilarity, tasteFilmSelect } from "@/lib/reco/profile";
import type { Film, Prisma } from "@/generated/prisma/client";

export type DuoPick = {
  film: Film;
  /** Affinité du film avec vos deux goûts réunis. */
  pct: number;
  mePct: number;
  friendPct: number;
  /** Film aimé par chacun qui explique la proposition, s'il y en a un. */
  meBecause: LibraryFilm | null;
  friendBecause: LibraryFilm | null;
  inMyWatchlist: boolean;
  inFriendWatchlist: boolean;
};

/** Films des bibliothèques : le profil de goûts, plus le titre pour les explications. */
const libraryFilmSelect = { id: true, title: true, titleEn: true, ...tasteFilmSelect } as const;
type LibraryFilm = Prisma.FilmGetPayload<{ select: typeof libraryFilmSelect }>;

const libraryOf = (userId: string) =>
  prisma.userFilm.findMany({
    where: { userId },
    select: {
      filmId: true,
      watched: true,
      inWatchlist: true,
      rating: true,
      liked: true,
      film: { select: libraryFilmSelect },
    },
  });

/** Un même réalisateur n'occupe pas plus de deux places. */
function diversify(list: DuoPick[]) {
  const perDirector = new Map<number, number>();
  return list.filter(({ film }) => {
    const d = refs(film.directors)[0];
    if (!d) return true;
    const n = (perDirector.get(d.id) ?? 0) + 1;
    perDirector.set(d.id, n);
    return n <= 2;
  });
}

/**
 * Films à voir à deux : ni l'un ni l'autre ne les a vus, et ils plaisent aux deux.
 * Candidats : les recommandations et les watchlists de chacun. Chaque film est noté
 * avec le profil de goûts de chacun ; le score commun privilégie le moins convaincu
 * des deux, pour qu'aucun ne s'ennuie.
 */
export async function getDuoPicks(meId: string, friendId: string, take = 25) {
  const [mine, theirs, recos, hidden] = await Promise.all([
    libraryOf(meId),
    libraryOf(friendId),
    prisma.recommendation.findMany({
      where: { userId: { in: [meId, friendId] }, hidden: false },
      select: { filmId: true },
    }),
    prisma.recommendation.findMany({
      where: { userId: { in: [meId, friendId] }, hidden: true },
      select: { filmId: true },
    }),
  ]);

  const rated = (lib: typeof mine) =>
    lib.filter((uf) => uf.watched).map((uf) => ({ film: uf.film, weight: filmWeight(uf) }));
  const [ratedMe, ratedFriend] = [rated(mine), rated(theirs)];
  if (ratedMe.length < 3 || ratedFriend.length < 3) return [];

  const excluded = new Set([
    ...mine.filter((uf) => uf.watched).map((uf) => uf.filmId),
    ...theirs.filter((uf) => uf.watched).map((uf) => uf.filmId),
    ...hidden.map((h) => h.filmId),
  ]);
  const watchlist = (lib: typeof mine) =>
    new Set(lib.filter((uf) => uf.inWatchlist && !uf.watched).map((uf) => uf.filmId));
  const [myWatchlist, friendWatchlist] = [watchlist(mine), watchlist(theirs)];
  const ids = [...new Set([...recos.map((r) => r.filmId), ...myWatchlist, ...friendWatchlist])].filter(
    (id) => !excluded.has(id),
  );
  // Seuls les films détaillés (réalisateurs, thèmes…) peuvent être comparés aux goûts.
  const films = await prisma.film.findMany({ where: { id: { in: ids }, detailsFetchedAt: { not: null } } });

  const [profileMe, profileFriend] = [buildProfile(ratedMe), buildProfile(ratedFriend)];
  const scored = films.map((film) => {
    const features = filmFeatures(film);
    const q = quality(film);
    const me = 0.65 * profileSimilarity(profileMe, features).score + 0.35 * q + (myWatchlist.has(film.id) ? 0.06 : 0);
    const friend =
      0.65 * profileSimilarity(profileFriend, features).score + 0.35 * q + (friendWatchlist.has(film.id) ? 0.06 : 0);
    return { film, me, friend, duo: 0.6 * Math.min(me, friend) + 0.4 * ((me + friend) / 2) };
  });
  scored.sort((a, b) => b.duo - a.duo);

  const picks = scored.map(({ film, me, friend, duo }): DuoPick => ({
    film,
    pct: toPct(duo),
    mePct: toPct(me),
    friendPct: toPct(friend),
    meBecause: null,
    friendBecause: null,
    inMyWatchlist: myWatchlist.has(film.id),
    inFriendWatchlist: friendWatchlist.has(film.id),
  }));
  return diversify(picks)
    .slice(0, take)
    .map((p) => ({
      ...p,
      meBecause: closestLiked(p.film, ratedMe, 1)[0] ?? null,
      friendBecause: closestLiked(p.film, ratedFriend, 1)[0] ?? null,
    }));
}
