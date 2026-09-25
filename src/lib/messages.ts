import "server-only";
import { prisma } from "@/lib/db";
import { friendIds, getRelation } from "@/lib/friends";

export const MESSAGE_MAX_LENGTH = 2000;
/** Limite anti-abus : messages envoyés par minute et par utilisateur. */
export const MESSAGES_PER_MINUTE = 20;

const filmCard = { id: true, tmdbId: true, title: true, year: true, posterPath: true, backdropPath: true } as const;

export const messageSelect = {
  id: true,
  senderId: true,
  body: true,
  createdAt: true,
  readAt: true,
  film: { select: filmCard },
} as const;

/** Seuls deux amis peuvent échanger des messages. */
export async function canMessage(meId: string, otherId: string) {
  return meId !== otherId && (await getRelation(meId, otherId)) === "friends";
}

export function unreadMessageCount(userId: string) {
  return prisma.message.count({ where: { recipientId: userId, readAt: null } });
}

/** Conversations avec chaque ami : dernier message et nombre de non-lus, les plus récentes d'abord. */
export async function getConversations(userId: string) {
  const ids = await friendIds(userId);
  if (ids.length === 0) return [];
  const [friends, unread] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, handle: true } }),
    prisma.message.groupBy({
      by: ["senderId"],
      where: { recipientId: userId, readAt: null, senderId: { in: ids } },
      _count: { _all: true },
    }),
  ]);
  const unreadBy = new Map(unread.map((u) => [u.senderId, u._count._all]));
  const rows = await Promise.all(
    friends.map(async (friend) => {
      const last = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: userId, recipientId: friend.id },
            { senderId: friend.id, recipientId: userId },
          ],
        },
        orderBy: { createdAt: "desc" },
        select: messageSelect,
      });
      return { friend, last, unread: unreadBy.get(friend.id) ?? 0 };
    }),
  );
  return rows.sort(
    (a, b) =>
      (b.last?.createdAt.getTime() ?? 0) - (a.last?.createdAt.getTime() ?? 0) ||
      (a.friend.name ?? a.friend.handle).localeCompare(b.friend.name ?? b.friend.handle),
  );
}

/** Messages échangés avec un ami (les 200 derniers, ou ceux postérieurs à `after`), du plus ancien au plus récent. */
export async function getThread(userId: string, otherId: string, after?: Date) {
  const where = {
    OR: [
      { senderId: userId, recipientId: otherId },
      { senderId: otherId, recipientId: userId },
    ],
    ...(after ? { createdAt: { gt: after } } : {}),
  };
  const rows = await prisma.message.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, select: messageSelect });
  return rows.reverse();
}

export function markThreadRead(userId: string, otherId: string) {
  return prisma.message.updateMany({
    where: { recipientId: userId, senderId: otherId, readAt: null },
    data: { readAt: new Date() },
  });
}
