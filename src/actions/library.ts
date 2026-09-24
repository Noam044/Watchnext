"use server";

import { revalidatePath } from "next/cache";
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
    const data = await syncRss(user.id, username);
    revalidatePath("/dashboard");
    return { ok: true, data };
  } catch (e) {
    return toErrorResult(e);
  }
}

export async function regenerateAction(): Promise<ActionResult<{ count: number }>> {
  const user = await requireUser();
  try {
    const { count } = await generateRecommendations(user.id);
    revalidatePath("/dashboard");
    return { ok: true, data: { count } };
  } catch (e) {
    return toErrorResult(e);
  }
}

async function ownReco(userId: string, recoId: string) {
  return prisma.recommendation.findFirst({ where: { id: recoId, userId } });
}

export async function hideRecommendationAction(recoId: string): Promise<ActionResult> {
  const user = await requireUser();
  const reco = await ownReco(user.id, recoId);
  if (!reco) return { ok: false, error: "Recommandation introuvable." };
  await prisma.recommendation.update({ where: { id: reco.id }, data: { hidden: true } });
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function unhideAllAction(): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.recommendation.deleteMany({ where: { userId: user.id, hidden: true } });
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function markSeenAction(recoId: string, liked = false): Promise<ActionResult> {
  const user = await requireUser();
  const reco = await ownReco(user.id, recoId);
  if (!reco) return { ok: false, error: "Recommandation introuvable." };
  await prisma.$transaction([
    prisma.userFilm.upsert({
      where: { userId_filmId: { userId: user.id, filmId: reco.filmId } },
      create: { userId: user.id, filmId: reco.filmId, watched: true, liked },
      update: { watched: true, inWatchlist: false, ...(liked ? { liked: true } : {}) },
    }),
    prisma.recommendation.delete({ where: { id: reco.id } }),
  ]);
  revalidatePath("/dashboard");
  return { ok: true };
}
