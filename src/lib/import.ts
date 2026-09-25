import "server-only";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ensureFilmDetails, matchFilm, upsertListItems } from "@/lib/films";
import { mapLimit } from "@/lib/limit";
import { mergeUserFilm } from "@/lib/library";
import { fetchLetterboxdRss, normalizeUsername } from "@/lib/letterboxd/rss";
import type { ExportEntry } from "@/lib/letterboxd/export";

/** Import rapide : lit le flux RSS et fusionne les ~50 dernières entrées. */
export async function syncRss(userId: string, rawUsername: string) {
  const username = normalizeUsername(rawUsername);
  const entries = await fetchLetterboxdRss(username);

  let imported = 0;
  let changed = 0;
  await mapLimit(entries, 6, async (e) => {
    const film = await ensureFilmDetails(e.tmdbId);
    if (!film) return;
    const merged = await mergeUserFilm(userId, film.id, {
      watched: true,
      inWatchlist: false,
      rating: e.rating,
      liked: e.liked,
      watchedAt: e.watchedAt,
      review: e.review,
      reviewSpoilers: e.reviewSpoilers,
      reviewedAt: e.review ? e.watchedAt : null,
    });
    imported++;
    if (merged.changed) changed++;
  });

  await prisma.letterboxdProfile.upsert({
    where: { userId },
    create: { userId, username, lastRssSync: new Date() },
    update: { username, lastRssSync: new Date(), lastSyncError: null },
  });
  /** changed : entrées nouvelles ou modifiées depuis la dernière synchronisation */
  return { username, found: entries.length, imported, changed };
}

/** Import complet, étape 1 : enregistre les entrées à rapprocher de TMDB. */
export async function createImportJob(userId: string, fileName: string, entries: ExportEntry[]) {
  // Un seul import actif à la fois : on abandonne les éventuels imports inachevés.
  await prisma.importJob.updateMany({
    where: { userId, status: { in: ["PENDING", "PROCESSING"] } },
    data: { status: "FAILED", error: "Remplacé par un nouvel import." },
  });
  const job = await prisma.importJob.create({
    data: { userId, fileName, total: entries.length, status: "PENDING" },
  });
  const CHUNK = 1000;
  for (let i = 0; i < entries.length; i += CHUNK) {
    await prisma.importEntry.createMany({
      data: entries.slice(i, i + CHUNK).map((e) => ({ jobId: job.id, ...e })),
    });
  }
  return job;
}

export type JobProgress = {
  id: string;
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  total: number;
  processed: number;
  matched: number;
  notFound: number;
};

async function progress(jobId: string): Promise<JobProgress> {
  const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId } });
  const notFound = await prisma.importEntry.count({ where: { jobId, status: "NOT_FOUND" } });
  return {
    id: job.id,
    status: job.status,
    total: job.total,
    processed: job.processed,
    matched: job.matched,
    notFound,
  };
}

/**
 * Import complet, étape 2 : traite un lot d'entrées (recherche TMDB + fusion).
 * Appelé en boucle par le client ; reprend là où il s'est arrêté (quota, fermeture d'onglet…).
 */
export async function processImportBatch(userId: string, jobId: string, batchSize = 30): Promise<JobProgress> {
  const job = await prisma.importJob.findFirst({ where: { id: jobId, userId } });
  if (!job) throw new AppError("NOT_FOUND", "Import introuvable.", 404);
  if (job.status === "DONE" || job.status === "FAILED") return progress(jobId);

  await prisma.importJob.update({ where: { id: jobId }, data: { status: "PROCESSING" } });
  const batch = await prisma.importEntry.findMany({
    where: { jobId, status: "PENDING" },
    take: batchSize,
    orderBy: { id: "asc" },
  });

  let quotaError: AppError | null = null;
  const results = await mapLimit(batch, 5, async (entry) => {
    if (quotaError) return null;
    try {
      const match = await matchFilm(entry.title, entry.year);
      if (!match) {
        await prisma.importEntry.update({ where: { id: entry.id }, data: { status: "NOT_FOUND" } });
        return "NOT_FOUND" as const;
      }
      // Les films vus alimentent le profil de goûts : il faut leurs détails complets.
      const film = entry.watched
        ? await ensureFilmDetails(match.id)
        : (await upsertListItems([match])).get(match.id);
      if (!film) {
        await prisma.importEntry.update({ where: { id: entry.id }, data: { status: "NOT_FOUND" } });
        return "NOT_FOUND" as const;
      }
      await mergeUserFilm(userId, film.id, {
        watched: entry.watched,
        inWatchlist: entry.inWatchlist,
        rating: entry.rating,
        liked: entry.liked,
        watchedAt: entry.watchedAt,
        review: entry.review,
        reviewedAt: entry.reviewedAt,
      });
      await prisma.importEntry.update({ where: { id: entry.id }, data: { status: "MATCHED", tmdbId: match.id } });
      return "MATCHED" as const;
    } catch (e) {
      if (e instanceof AppError && (e.code === "TMDB_QUOTA" || e.code === "TMDB_AUTH" || e.code === "TMDB_UNAVAILABLE")) {
        quotaError ??= e; // l'entrée reste PENDING, elle sera retentée
        return null;
      }
      console.error("import entry failed", entry.title, e);
      await prisma.importEntry.update({ where: { id: entry.id }, data: { status: "ERROR" } });
      return "ERROR" as const;
    }
  });

  const done = results.filter((r) => r !== null).length;
  const matched = results.filter((r) => r === "MATCHED").length;
  const remaining = await prisma.importEntry.count({ where: { jobId, status: "PENDING" } });
  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      processed: { increment: done },
      matched: { increment: matched },
      ...(remaining === 0 ? { status: "DONE", finishedAt: new Date() } : {}),
    },
  });
  if (remaining === 0) {
    await prisma.letterboxdProfile.upsert({
      where: { userId },
      create: { userId, lastImportAt: new Date() },
      update: { lastImportAt: new Date() },
    });
  }
  if (quotaError) throw quotaError;
  return progress(jobId);
}

export async function getUnmatched(userId: string, jobId?: string) {
  const job = jobId
    ? await prisma.importJob.findFirst({ where: { id: jobId, userId } })
    : await prisma.importJob.findFirst({ where: { userId, status: "DONE" }, orderBy: { createdAt: "desc" } });
  if (!job) return null;
  const entries = await prisma.importEntry.findMany({
    where: { jobId: job.id, status: { in: ["NOT_FOUND", "ERROR"] } },
    orderBy: { title: "asc" },
    select: { id: true, title: true, year: true, letterboxdUri: true, status: true },
  });
  return { job, entries };
}
