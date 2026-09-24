import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mapLimit } from "@/lib/limit";
import { CRON_SYNC_INTERVAL, claimSync, runClaimedSync } from "@/lib/sync";

// Tâche planifiée Vercel (vercel.json) : synchronise chaque jour le flux RSS de tous les comptes.
export const maxDuration = 300;
/** On s'arrête avant la limite de durée ; les comptes restants passeront au prochain passage. */
const TIME_BUDGET = 240_000;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET n'est pas configuré." }, { status: 500 });
  }
  // Vercel envoie « Authorization: Bearer <CRON_SECRET> » à chaque déclenchement.
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const started = Date.now();
  const due = await prisma.letterboxdProfile.findMany({
    where: {
      username: { not: null },
      OR: [{ lastSyncAttemptAt: null }, { lastSyncAttemptAt: { lt: new Date(started - CRON_SYNC_INTERVAL) } }],
    },
    orderBy: { lastSyncAttemptAt: { sort: "asc", nulls: "first" } },
    select: { userId: true },
    take: 500,
  });

  const tally = { due: due.length, synced: 0, withChanges: 0, failed: 0, skipped: 0 };
  await mapLimit(due, 3, async ({ userId }) => {
    if (Date.now() - started > TIME_BUDGET) {
      tally.skipped++;
      return;
    }
    const username = await claimSync(userId, CRON_SYNC_INTERVAL);
    if (!username) {
      tally.skipped++;
      return;
    }
    const outcome = await runClaimedSync(userId, username);
    if (!outcome.ok) tally.failed++;
    else {
      tally.synced++;
      if (outcome.changed > 0) tally.withChanges++;
    }
  });

  return NextResponse.json({ ...tally, durationMs: Date.now() - started });
}
