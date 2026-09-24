"use server";

import { cookies } from "next/headers";
import { requireUser } from "@/lib/session";
import { EXPORT_REMINDER_COOKIE, getSyncState } from "@/lib/sync";

export type SyncStateDTO = { running: boolean; lastRssSync: string | null; error: string | null };

/** État de la synchronisation Letterboxd, interrogé pendant une synchronisation en arrière-plan. */
export async function syncStateAction(): Promise<SyncStateDTO> {
  const user = await requireUser();
  const s = await getSyncState(user.id);
  return { running: s.running, lastRssSync: s.lastRssSync?.toISOString() ?? null, error: s.error };
}

/** « Plus tard » sur le rappel d'export : masqué pendant 14 jours. */
export async function snoozeExportReminderAction() {
  await requireUser();
  (await cookies()).set(EXPORT_REMINDER_COOKIE, "1", {
    maxAge: 14 * 24 * 60 * 60,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}
