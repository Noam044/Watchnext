import "server-only";
import { prisma } from "@/lib/db";
import type { Friendship } from "@/generated/prisma/client";

/** Lien entre l'utilisateur connecté et un autre utilisateur. */
export type Relation = "self" | "none" | "friends" | "outgoing" | "incoming";

export function findFriendship(a: string, b: string) {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
  });
}

export function relationFrom(meId: string, otherId: string, f: Friendship | null): Relation {
  if (meId === otherId) return "self";
  if (!f) return "none";
  if (f.status === "ACCEPTED") return "friends";
  return f.requesterId === meId ? "outgoing" : "incoming";
}

export async function getRelation(meId: string, otherId: string): Promise<Relation> {
  if (meId === otherId) return "self";
  return relationFrom(meId, otherId, await findFriendship(meId, otherId));
}

export async function friendIds(userId: string) {
  const rows = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}

export function pendingRequestCount(userId: string) {
  return prisma.friendship.count({ where: { addresseeId: userId, status: "PENDING" } });
}

/** Bibliothèque visible : soi-même, un ami, ou un profil public. */
export function canViewLibrary(relation: Relation, publicProfile: boolean) {
  return relation === "self" || relation === "friends" || publicProfile;
}

export type TasteMatch = { common: number; bothLiked: number; ratedTogether: number; pct: number | null };

const NO_MATCH: TasteMatch = { common: 0, bothLiked: 0, ratedTogether: 0, pct: null };

/**
 * Affinité entre un spectateur et plusieurs autres, calculée en une requête sur les films vus par les deux :
 * 100 % quand les notes sont identiques, 0 % quand elles s'écartent de 3 étoiles en moyenne
 * (à partir de 5 films notés par les deux).
 */
export async function tasteMatches(meId: string, otherIds: string[]): Promise<Map<string, TasteMatch>> {
  const out = new Map<string, TasteMatch>();
  if (otherIds.length === 0) return out;
  const rows = await prisma.$queryRaw<
    { otherId: string; common: number; bothLiked: number; ratedTogether: number; meanDiff: number | null }[]
  >`
    SELECT b."userId" AS "otherId",
      COUNT(*)::int AS "common",
      (COUNT(*) FILTER (WHERE a."liked" AND b."liked"))::int AS "bothLiked",
      (COUNT(*) FILTER (WHERE a."rating" IS NOT NULL AND b."rating" IS NOT NULL))::int AS "ratedTogether",
      AVG(ABS(a."rating" - b."rating")) FILTER (WHERE a."rating" IS NOT NULL AND b."rating" IS NOT NULL) AS "meanDiff"
    FROM "UserFilm" a
    JOIN "UserFilm" b ON b."filmId" = a."filmId"
    WHERE a."userId" = ${meId} AND a."watched" AND b."watched" AND b."userId" = ANY(${otherIds})
    GROUP BY b."userId"`;
  for (const r of rows) {
    out.set(r.otherId, {
      common: r.common,
      bothLiked: r.bothLiked,
      ratedTogether: r.ratedTogether,
      pct:
        r.ratedTogether >= 5 && r.meanDiff != null ? Math.round(100 * Math.max(0, 1 - Number(r.meanDiff) / 3)) : null,
    });
  }
  return out;
}

export async function tasteMatch(aId: string, bId: string): Promise<TasteMatch> {
  return (await tasteMatches(aId, [bId])).get(bId) ?? NO_MATCH;
}

/** Films adorés par `ownerId` (4,5★ et plus, ou likés) que `viewerId` n'a pas vus. */
export async function favoritesNotSeenBy(ownerId: string, viewerId: string, take = 12) {
  const seen = await prisma.userFilm.findMany({ where: { userId: viewerId, watched: true }, select: { filmId: true } });
  return prisma.userFilm.findMany({
    where: {
      userId: ownerId,
      watched: true,
      OR: [{ rating: { gte: 4.5 } }, { liked: true }],
      filmId: { notIn: seen.map((s) => s.filmId) },
    },
    orderBy: [{ rating: { sort: "desc", nulls: "last" } }, { watchedAt: { sort: "desc", nulls: "last" } }],
    include: { film: true },
    take,
  });
}
