import "server-only";
import { prisma } from "@/lib/db";
import type { Film, Prisma } from "@/generated/prisma/client";

/** Champs d'un utilisateur affichables à d'autres utilisateurs. */
export const publicUserSelect = {
  id: true,
  name: true,
  handle: true,
  bio: true,
  publicProfile: true,
  createdAt: true,
  emblemFilm: true,
  letterboxd: { select: { username: true } },
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export type Emblem = Pick<Film, "tmdbId" | "title" | "year" | "backdropPath" | "posterPath">;

/**
 * Film dont l'image sert de bannière : le film fétiche choisi, sinon le film
 * le mieux noté (puis le plus récent) qui a une image de fond.
 */
export async function resolveEmblem(user: { id: string; emblemFilm: Film | null }): Promise<Emblem | null> {
  if (user.emblemFilm?.backdropPath) return user.emblemFilm;
  const top = await prisma.userFilm.findFirst({
    where: { userId: user.id, watched: true, film: { backdropPath: { not: null } } },
    orderBy: [
      { rating: { sort: "desc", nulls: "last" } },
      { liked: "desc" },
      { watchedAt: { sort: "desc", nulls: "last" } },
    ],
    include: { film: true },
  });
  return top?.film ?? user.emblemFilm ?? null;
}

/** Films proposés comme film fétiche : les mieux notés ou likés, avec une image de fond. */
export function emblemCandidates(userId: string, take = 18) {
  return prisma.userFilm.findMany({
    where: {
      userId,
      watched: true,
      OR: [{ rating: { gte: 4 } }, { liked: true }],
      film: { backdropPath: { not: null } },
    },
    orderBy: [{ rating: { sort: "desc", nulls: "last" } }, { liked: "desc" }, { watchedAt: { sort: "desc", nulls: "last" } }],
    include: { film: true },
    take,
  });
}

export const LIBRARY_TABS = ["rated", "watched", "liked", "watchlist"] as const;
export type LibraryTab = (typeof LIBRARY_TABS)[number];
export const LIBRARY_SORTS = ["recent", "rating", "title", "year"] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];
export const LIBRARY_PAGE_SIZE = 48;

const TAB_WHERE: Record<LibraryTab, Prisma.UserFilmWhereInput> = {
  rated: { watched: true, rating: { not: null } },
  watched: { watched: true },
  liked: { liked: true },
  watchlist: { inWatchlist: true, watched: false },
};

const SORT_ORDER: Record<LibrarySort, Prisma.UserFilmOrderByWithRelationInput[]> = {
  recent: [{ watchedAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
  rating: [{ rating: { sort: "desc", nulls: "last" } }, { watchedAt: { sort: "desc", nulls: "last" } }],
  title: [{ film: { title: "asc" } }],
  year: [{ film: { year: { sort: "desc", nulls: "last" } } }, { film: { title: "asc" } }],
};

export type LibraryQuery = { tab: LibraryTab; sort: LibrarySort; rating: number | null; q: string; page: number };

export function parseLibraryQuery(sp: Record<string, string | string[] | undefined>): LibraryQuery {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? "";
  const tab = (LIBRARY_TABS as readonly string[]).includes(one("tab")) ? (one("tab") as LibraryTab) : "rated";
  const sort = (LIBRARY_SORTS as readonly string[]).includes(one("sort")) ? (one("sort") as LibrarySort) : "recent";
  const r = Number(one("note"));
  const rating = r >= 0.5 && r <= 5 && Number.isInteger(r * 2) ? r : null;
  const page = Math.max(1, Math.floor(Number(one("page"))) || 1);
  return { tab, sort, rating, q: one("q").trim().slice(0, 80), page };
}

export async function getLibraryPage(userId: string, query: LibraryQuery) {
  const where: Prisma.UserFilmWhereInput = { userId, ...TAB_WHERE[query.tab] };
  if (query.rating != null) where.rating = query.rating;
  if (query.q) {
    where.film = {
      OR: [
        { title: { contains: query.q, mode: "insensitive" } },
        { originalTitle: { contains: query.q, mode: "insensitive" } },
      ],
    };
  }
  const [total, rows] = await Promise.all([
    prisma.userFilm.count({ where }),
    prisma.userFilm.findMany({
      where,
      orderBy: SORT_ORDER[query.sort],
      include: { film: true },
      skip: (query.page - 1) * LIBRARY_PAGE_SIZE,
      take: LIBRARY_PAGE_SIZE,
    }),
  ]);
  return { total, rows, pageCount: Math.max(1, Math.ceil(total / LIBRARY_PAGE_SIZE)) };
}

export async function getLibraryCounts(userId: string): Promise<Record<LibraryTab, number>> {
  const [rated, watched, liked, watchlist] = await Promise.all(
    LIBRARY_TABS.map((tab) => prisma.userFilm.count({ where: { userId, ...TAB_WHERE[tab] } })),
  );
  return { rated, watched, liked, watchlist };
}

/** Vrai tant que la bibliothèque ne vient que du flux RSS (aucun import complet réussi). */
export async function needsFullImport(userId: string) {
  const lb = await prisma.letterboxdProfile.findUnique({
    where: { userId },
    select: { lastRssSync: true, lastImportAt: true },
  });
  return !!lb?.lastRssSync && !lb.lastImportAt;
}
