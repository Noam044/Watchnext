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

/**
 * Affinité entre deux spectateurs, calculée sur les films notés par les deux :
 * 100 % quand les notes sont identiques, 0 % quand elles s'écartent de 3 étoiles en moyenne.
 */
export async function tasteMatch(aId: string, bId: string) {
  const [a, b] = await Promise.all(
    [aId, bId].map((userId) =>
      prisma.userFilm.findMany({ where: { userId, watched: true }, select: { filmId: true, rating: true, liked: true } }),
    ),
  );
  const byFilm = new Map(a.map((f) => [f.filmId, f]));
  let common = 0;
  let bothLiked = 0;
  const diffs: number[] = [];
  for (const fb of b) {
    const fa = byFilm.get(fb.filmId);
    if (!fa) continue;
    common++;
    if (fa.liked && fb.liked) bothLiked++;
    if (fa.rating != null && fb.rating != null) diffs.push(Math.abs(fa.rating - fb.rating));
  }
  const pct =
    diffs.length >= 5
      ? Math.round(100 * Math.max(0, 1 - diffs.reduce((s, d) => s + d, 0) / diffs.length / 3))
      : null;
  return { common, bothLiked, ratedTogether: diffs.length, pct };
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
