import "server-only";
import webpush from "web-push";
import { isLocale, type Locale } from "@/i18n/config";
import { prisma } from "@/lib/db";

/**
 * Notifications push (Web Push, clés VAPID). Générer les clés avec : npx web-push generate-vapid-keys
 * VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, et VAPID_SUBJECT (mailto: d'un contact).
 */
export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

let ready = false;
function setup() {
  const pub = vapidPublicKey();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!pub || !priv) return false;
  if (!ready) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT?.trim() || "mailto:contact@watchnext.app", pub, priv);
    ready = true;
  }
  return true;
}

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/**
 * Envoie une notification à tous les appareils abonnés d'un utilisateur, dans la langue de chaque
 * appareil. Les abonnements expirés (404 / 410) sont supprimés. N'échoue jamais : c'est un bonus.
 */
export async function sendPush(userId: string, build: (locale: Locale) => PushPayload) {
  if (!setup()) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (s) => {
      const payload = build(isLocale(s.locale) ? s.locale : "fr");
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          {
            TTL: 60 * 60 * 12,
            urgency: "normal",
            // Une notification plus récente sur le même sujet remplace l'ancienne (32 caractères URL-safe max).
            topic: payload.tag?.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || undefined,
          },
        );
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        } else {
          console.error("Notification push", status ?? e);
        }
      }
    }),
  );
}
