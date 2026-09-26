"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { dictionaries } from "@/i18n/dictionaries";
import { getI18n, getLocale } from "@/i18n/server";
import { localizeFilms } from "@/lib/film-locale";
import { avatarUrl } from "@/lib/avatar";
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
import { sendPush } from "@/lib/push";
import { requireUser } from "@/lib/session";
import { displayName } from "@/lib/users";

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
    film: m.film
      ? { tmdbId: m.film.tmdbId, title: m.film.title, year: m.film.year, posterPath: m.film.posterPath }
      : null,
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
  // Notification push au destinataire, envoyée après la réponse (une par conversation, remplacée par la suivante),
  // avec le titre du film dans la langue de chacun de ses appareils.
  const shared = message.film ? { fr: message.film.title, en: message.film.titleEn || message.film.title } : null;
  after(() =>
    sendPush(input.toUserId, (locale) => {
      const t = dictionaries[locale].messages;
      return {
        title: displayName(me),
        body: shared ? t.pushFilm(shared[locale], body) : (body ?? ""),
        url: `/messages/${me.handle}`,
        tag: `msg-${me.id}`,
      };
    }),
  );
  return { ok: true, data: { message: toDTO(localizeFilms(message, await getLocale()), me.id) } };
}

/** Nouveaux messages d'une conversation depuis `afterISO` ; les marque comme lus. */
export async function pollThreadAction(
  friendId: string,
  afterISO: string | null,
): Promise<ActionResult<{ messages: MessageDTO[] }>> {
  const me = await requireUser();
  if (!(await canMessage(me.id, friendId))) return { ok: false, error: (await getI18n()).t.messages.errConversation };
  const rows = await getThread(me.id, friendId, afterISO ? new Date(afterISO) : undefined);
  if (rows.some((m) => m.senderId === friendId && !m.readAt)) await markThreadRead(me.id, friendId);
  return { ok: true, data: { messages: localizeFilms(rows, await getLocale()).map((m) => toDTO(m, me.id)) } };
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
    latestFrom: latest ? latest.sender.name?.trim() || latest.sender.handle : null,
  };
}

/** Amis à qui envoyer un film (fenêtre « Envoyer à un ami »). */
export async function shareTargetsAction(): Promise<
  { id: string; name: string; handle: string; avatar: string | null }[]
> {
  const me = await requireUser();
  const ids = await friendIds(me.id);
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, handle: true, avatarAt: true },
    orderBy: { handle: "asc" },
  });
  return users.map((u) => ({ id: u.id, name: u.name?.trim() || u.handle, handle: u.handle, avatar: avatarUrl(u) }));
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
                { titleEn: { contains: query, mode: "insensitive" } },
                { originalTitle: { contains: query, mode: "insensitive" } },
              ],
            },
          }
        : { OR: [{ liked: true }, { rating: { gte: 4 } }] }),
    },
    orderBy: [{ rating: { sort: "desc", nulls: "last" } }, { watchedAt: { sort: "desc", nulls: "last" } }],
    take: 12,
    select: {
      rating: true,
      film: { select: { tmdbId: true, title: true, titleEn: true, year: true, posterPath: true } },
    },
  });
  return localizeFilms(rows, await getLocale()).map(({ rating, film }) => ({
    tmdbId: film.tmdbId,
    title: film.title,
    year: film.year,
    posterPath: film.posterPath,
    rating,
  }));
}
