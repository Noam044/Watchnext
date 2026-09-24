import "server-only";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { syncRss } from "@/lib/import";
import { generateRecommendations } from "@/lib/reco/engine";

const HOUR = 60 * 60 * 1000;
/** Synchronisation automatique à l'ouverture de l'app : au plus une fois par période. */
export const AUTO_SYNC_INTERVAL = 6 * HOUR;
/** Tâche planifiée quotidienne : ignore les comptes synchronisés récemment. */
export const CRON_SYNC_INTERVAL = 20 * HOUR;
/** Un verrou plus vieux que ça vient d'une synchronisation interrompue : on le reprend. */
const STALE_LOCK = 5 * 60 * 1000;
/** Cookie posé par « Plus tard » sur le rappel d'export (voir snoozeExportReminderAction). */
export const EXPORT_REMINDER_COOKIE = "wn_export_reminder_snoozed";
/** Au-delà, on propose de refaire un export complet (watchlist, notes modifiées). */
export const FULL_IMPORT_MAX_AGE = 30 * 24 * HOUR;

/**
 * Réserve la synchronisation RSS d'un utilisateur si elle est due et qu'aucune
 * autre n'est en cours. La réservation est atomique : deux onglets ou la tâche
 * planifiée ne lancent jamais la même synchronisation deux fois.
 * Retourne le pseudo Letterboxd à synchroniser, ou null.
 */
export async function claimSync(userId: string, minInterval: number): Promise<string | null> {
  const now = Date.now();
  const { count } = await prisma.letterboxdProfile.updateMany({
    where: {
      userId,
      username: { not: null },
      AND: [
        { OR: [{ syncStartedAt: null }, { syncStartedAt: { lt: new Date(now - STALE_LOCK) } }] },
        { OR: [{ lastSyncAttemptAt: null }, { lastSyncAttemptAt: { lt: new Date(now - minInterval) } }] },
      ],
    },
    data: { syncStartedAt: new Date(now), lastSyncAttemptAt: new Date(now) },
  });
  if (count === 0) return null;
  const lb = await prisma.letterboxdProfile.findUnique({ where: { userId }, select: { username: true } });
  return lb?.username ?? null;
}

export type SyncOutcome = { ok: true; changed: number } | { ok: false; error: string };

/**
 * Exécute une synchronisation réservée par claimSync : relit le flux RSS, recalcule
 * les recommandations s'il y a du nouveau, puis libère le verrou (erreur mémorisée).
 */
export async function runClaimedSync(userId: string, username: string): Promise<SyncOutcome> {
  try {
    const { changed } = await syncRss(userId, username);
    if (changed > 0) {
      try {
        await generateRecommendations(userId);
      } catch (e) {
        // Moins de 3 films vus : rien à recommander, ce n'est pas un échec de synchronisation.
        if (!(e instanceof AppError && e.code === "NOT_ENOUGH_DATA")) throw e;
      }
    }
    await prisma.letterboxdProfile.update({ where: { userId }, data: { syncStartedAt: null, lastSyncError: null } });
    return { ok: true, changed };
  } catch (e) {
    const error =
      e instanceof AppError ? e.message : "Erreur inattendue pendant la synchronisation avec Letterboxd.";
    if (!(e instanceof AppError)) console.error(e);
    await prisma.letterboxdProfile.update({ where: { userId }, data: { syncStartedAt: null, lastSyncError: error } });
    return { ok: false, error };
  }
}

/** État de synchronisation affiché à l'utilisateur. */
export async function getSyncState(userId: string) {
  const lb = await prisma.letterboxdProfile.findUnique({
    where: { userId },
    select: { username: true, lastRssSync: true, lastImportAt: true, syncStartedAt: true, lastSyncError: true },
  });
  const running = !!lb?.syncStartedAt && Date.now() - lb.syncStartedAt.getTime() < STALE_LOCK;
  return {
    username: lb?.username ?? null,
    lastRssSync: lb?.lastRssSync ?? null,
    lastImportAt: lb?.lastImportAt ?? null,
    running,
    error: lb?.lastSyncError ?? null,
  };
}

/** Dernier export complet trop ancien pour refléter la watchlist et les notes modifiées. */
export function isFullImportStale(lastImportAt: Date | null) {
  return !!lastImportAt && Date.now() - lastImportAt.getTime() > FULL_IMPORT_MAX_AGE;
}
