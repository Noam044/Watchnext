import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

export const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Au plus `max` tentatives comptées par clé sur la fenêtre glissante `windowMs`. */
export type Limit = { key: string; max: number; windowMs: number };

/** Règles des formulaires sensibles : essais de mot de passe, inscriptions, liens de réinitialisation. */
export const LIMITS = {
  loginEmail: (email: string): Limit => ({ key: `login:email:${email}`, max: 5, windowMs: 15 * MINUTE }),
  loginIp: (ip: string): Limit => ({ key: `login:ip:${ip}`, max: 30, windowMs: 15 * MINUTE }),
  registerIp: (ip: string): Limit => ({ key: `register:ip:${ip}`, max: 5, windowMs: 60 * MINUTE }),
  resetEmail: (email: string): Limit => ({ key: `reset:email:${email}`, max: 3, windowMs: 60 * MINUTE }),
  resetIp: (ip: string): Limit => ({ key: `reset:ip:${ip}`, max: 10, windowMs: 60 * MINUTE }),
};

/** Adresse IP du visiteur (renseignée par Vercel dans x-forwarded-for). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Minutes à attendre avant qu'une de ces limites ne se libère, ou 0 si aucune n'est atteinte. */
export async function waitMinutes(limits: Limit[]): Promise<number> {
  let wait = 0;
  for (const l of limits) {
    const hits = await prisma.rateLimitHit.findMany({
      where: { key: l.key, createdAt: { gte: new Date(Date.now() - l.windowMs) } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
      take: l.max,
    });
    // La limite se libère quand la plus ancienne tentative de la fenêtre en sort.
    if (hits.length >= l.max) {
      wait = Math.max(wait, Math.ceil((hits[0].createdAt.getTime() + l.windowMs - Date.now()) / MINUTE));
    }
  }
  return wait;
}

export async function recordHits(...limits: Limit[]) {
  await prisma.rateLimitHit.createMany({ data: limits.map((l) => ({ key: l.key })) });
}

export async function clearHits(limit: Limit) {
  await prisma.rateLimitHit.deleteMany({ where: { key: limit.key } });
}

/** Purge quotidienne (tâche planifiée) : aucune fenêtre ne dépasse une heure. */
export function purgeOldHits() {
  return prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - DAY) } } });
}
