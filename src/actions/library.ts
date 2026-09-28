"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { toErrorResult, type ActionResult } from "@/lib/errors";
import { syncRss } from "@/lib/import";
import { generateRecommendations } from "@/lib/reco/engine";
import { requireUser } from "@/lib/session";

export async function syncRssAction(
  username: string,
): Promise<ActionResult<{ username: string; found: number; imported: number }>> {
  const user = await requireUser();
  try {
    // Pas de revalidation ici : les deux écrans qui synchronisent enchaînent avec regenerateAction, qui revalide.
    const data = await syncRss(user.id, username);
    return { ok: true, data };
  } catch (e) {
    return toErrorResult(e, (await getI18n()).t);
  }
}

export async function regenerateAction(): Promise<ActionResult<{ count: number }>> {
  const user = await requireUser();
  try {
    const { count } = await generateRecommendations(user.id);
    revalidatePath("/dashboard");
    return { ok: true, data: { count } };
  } catch (e) {
    return toErrorResult(e, (await getI18n()).t);
  }
}

async function ownReco(userId: string, recoId: string) {
  return prisma.recommendation.findFirst({ where: { id: recoId, userId } });
}

export async function hideRecommendationAction(recoId: string): Promise<ActionResult> {
  const user = await requireUser();
  const reco = await ownReco(user.id, recoId);
  if (!reco) return { ok: false, error: (await getI18n()).t.dashboard.recoNotFound };
  // Pas de revalidatePath : le programme retire déjà la carte côté client (voir reco-grid), et
  // revalider renverrait tout le tableau de bord recalculé à chaque clic.
  await prisma.recommendation.update({ where: { id: reco.id }, data: { hidden: true } });
  return { ok: true };
}

export async function unhideAllAction(): Promise<ActionResult> {
  const user = await requireUser();
  // Toujours suivi de regenerateAction, qui revalide le tableau de bord.
  await prisma.recommendation.deleteMany({ where: { userId: user.id, hidden: true } });
  return { ok: true };
}

export async function markSeenAction(recoId: string, liked = false): Promise<ActionResult> {
  const user = await requireUser();
  const reco = await ownReco(user.id, recoId);
  if (!reco) return { ok: false, error: (await getI18n()).t.dashboard.recoNotFound };
  await prisma.$transaction([
    prisma.userFilm.upsert({
      where: { userId_filmId: { userId: user.id, filmId: reco.filmId } },
      create: { userId: user.id, filmId: reco.filmId, watched: true, liked },
      update: { watched: true, inWatchlist: false, ...(liked ? { liked: true } : {}) },
    }),
    prisma.recommendation.delete({ where: { id: reco.id } }),
  ]);
  // Comme pour hideRecommendationAction : la carte est retirée côté client, sans revalidation.
  return { ok: true };
}
