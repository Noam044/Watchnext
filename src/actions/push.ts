"use server";

import { z } from "zod";
import { dictionaries } from "@/i18n/dictionaries";
import { getLocale } from "@/i18n/server";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/lib/errors";
import { sendPush } from "@/lib/push";
import { requireUser } from "@/lib/session";

const subscriptionSchema = z.object({
  endpoint: z.url().max(1000).startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Enregistre l'abonnement push de cet appareil (un appareil n'appartient qu'à un compte à la fois). */
export async function subscribePushAction(raw: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = subscriptionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid subscription" };
  const { endpoint, keys } = parsed.data;
  const locale = await getLocale();
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, locale },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth, locale },
  });
  return { ok: true };
}

export async function unsubscribePushAction(endpoint: string): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return { ok: true };
}

/** Notification d'essai envoyée à tous les appareils abonnés de l'utilisateur. */
export async function sendTestPushAction(): Promise<ActionResult> {
  const user = await requireUser();
  await sendPush(user.id, (locale) => ({
    title: "Watchnext",
    body: dictionaries[locale].settings.pushTestBody,
    url: "/profile/edit?section=notifications",
    tag: "test",
  }));
  return { ok: true };
}
