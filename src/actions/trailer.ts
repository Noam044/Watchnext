"use server";

import { requireUser } from "@/lib/session";
import { getTrailerKey } from "@/lib/tmdb";

/** Bande-annonce d'un film, demandée au clic (fiche rapide des recommandations). */
export async function trailerKeyAction(tmdbId: number): Promise<string | null> {
  await requireUser();
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return null;
  return getTrailerKey(tmdbId).catch(() => null);
}
