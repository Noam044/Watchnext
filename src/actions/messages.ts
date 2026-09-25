"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/i18n/server";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/lib/errors";
import { friendIds } from "@/lib/friends";
import {
  MESSAGES_PER_MINUTE,
  MESSAGE_MAX_LENGTH,
  canMessage,
  getThread,
  markThreadRead,
  messageSelect,
  unreadMessageCount,
} from "@/lib/messages";
import { pendingRequestCount } from "@/lib/friends";
import { requireUser } from "@/lib/session";

type MessageRow = Awaited<ReturnType<typeof getThread>>[number];

export type MessageDTO = {
  id: string;
  mine: boolean;
  body: string | null;
  createdAt: string;
  read: boolean;
  film: { tmdbId: number; title: string; year: number | null; posterPath: string | null } | null;
};

function toDTO(m: MessageRow, meId: string): MessageDTO {
  return {
    id: m.id,
    mine: m.senderId === meId,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    read: !!m.readAt,
    film: m.film ? { tmdbId: m.film.tmdbId, title: m.film.title, year: m.film.year, posterPath: m.film.posterPath } : null,
  };
}

/** Envoie un message (texte et/ou film) à un ami. */
export async function sendMessageAction(input: {
  toUserId: string;
  body?: string;
  tmdbId?: number;
}): Promise<ActionResult<{ message: MessageDTO }>> {
  const me = await requireUser();
  const m = (await getI18n()).t.messages;
  const body = input.body?.trim() || null;
  if (!body && !input.tmdbId) return { ok: false, error: m.errEmpty };
  if (body && body.length > MESSAGE_MAX_LENGTH) {
    return { ok: false, error: m.errTooLong(MESSAGE_MAX_LENGTH) };
  }
  if (!(await canMessage(me.id, input.toUserId))) {
    return { ok: false, error: m.errNotFriend };
  }
  const recent = await prisma.message.count({
    where: { senderId: me.id, createdAt: { gt: new Date(Date.now() - 60_000) } },
  });
  if (recent >= MESSAGES_PER_MINUTE) return { ok: false, error: m.errRate };

  let filmId: string | null = null;
  if (input.tmdbId) {
    const film = await prisma.film.findUnique({ where: { tmdbId: input.tmdbId }, select: { id: true } });
    if (!film) return { ok: false, error: m.errFilm };
    filmId = film.id;
  }
  const message = await prisma.message.create({
    data: { senderId: me.id, recipientId: input.toUserId, body, filmId },
    select: messageSelect,
  });
  revalidatePath("/messages", "layout");
  return { ok: true, data: { message: toDTO(message, me.id) } };
}

/** Nouveaux messages d'une conversation depuis `afterISO` ; les marque comme lus. */
export async function pollThreadAction(friendId: string, afterISO: string | null): Promise<ActionResult<{ messages: MessageDTO[] }>> {
  const me = await requireUser();
  if (!(await canMessage(me.id, friendId))) return { ok: false, error: (await getI18n()).t.messages.errConversation };
  const rows = await getThread(me.id, friendId, afterISO ? new Date(afterISO) : undefined);
  if (rows.some((m) => m.senderId === friendId && !m.readAt)) await markThreadRead(me.id, friendId);
  return { ok: true, data: { messages: rows.map((m) => toDTO(m, me.id)) } };
}

export type NotificationSummary = { unreadMessages: number; pendingRequests: number; latestFrom: string | null };

/** Compteurs affichés dans la navigation, interrogés régulièrement. */
export async function notificationSummaryAction(): Promise<NotificationSummary> {
  const me = await requireUser();
  const [unreadMessages, pendingRequests, latest] = await Promise.all([
    unreadMessageCount(me.id),
    pendingRequestCount(me.id),
    prisma.message.findFirst({
      where: { recipientId: me.id, readAt: null },
      orderBy: { createdAt: "desc" },
      select: { sender: { select: { name: true, handle: true } } },
    }),
  ]);
  return {
    unreadMessages,
    pendingRequests,
    latestFrom: latest ? (latest.sender.name?.trim() || latest.sender.handle) : null,
  };
}

/** Amis à qui envoyer un film (fenêtre « Envoyer à un ami »). */
export async function shareTargetsAction(): Promise<{ id: string; name: string; handle: string }[]> {
  const me = await requireUser();
  const ids = await friendIds(me.id);
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, handle: true },
    orderBy: { handle: "asc" },
  });
  return users.map((u) => ({ id: u.id, name: u.name?.trim() || u.handle, handle: u.handle }));
}

/** Films de ta bibliothèque à joindre à un message, recherchés par titre. */
export async function searchMyFilmsAction(q: string) {
  const me = await requireUser();
  const query = q.trim().slice(0, 80);
  const rows = await prisma.userFilm.findMany({
    where: {
      userId: me.id,
      ...(query
        ? {
            film: {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { originalTitle: { contains: query, mode: "insensitive" } },
              ],
            },
          }
        : { OR: [{ liked: true }, { rating: { gte: 4 } }] }),
    },
    orderBy: [{ rating: { sort: "desc", nulls: "last" } }, { watchedAt: { sort: "desc", nulls: "last" } }],
    take: 12,
    select: { rating: true, film: { select: { tmdbId: true, title: true, year: true, posterPath: true } } },
  });
  return rows.map((r) => ({ ...r.film, rating: r.rating }));
}
