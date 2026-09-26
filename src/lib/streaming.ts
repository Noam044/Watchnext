import "server-only";
import { prisma } from "@/lib/db";
import { ensureManyDetails, providersStale } from "@/lib/films";
import { isWatchRegion, type ProviderInfo, type WatchRegion } from "@/lib/providers";
import { getProviderCatalog } from "@/lib/tmdb";
import type { Film } from "@/generated/prisma/client";

/** Pays et abonnements de streaming d'un utilisateur. */
export async function getStreamingPrefs(userId: string): Promise<{ region: WatchRegion; providers: number[] }> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { watchRegion: true, streamingProviders: true },
  });
  return { region: isWatchRegion(u?.watchRegion) ? u.watchRegion : "FR", providers: u?.streamingProviders ?? [] };
}

/** Plateformes d'un pays (les plus répandues d'abord), ou seulement celles demandées. */
export async function providerCatalog(region: string, onlyIds?: Iterable<number>): Promise<ProviderInfo[]> {
  const all = await getProviderCatalog(region).catch(() => []);
  const wanted = onlyIds ? new Set(onlyIds) : null;
  return all.filter((p) => !wanted || wanted.has(p.id)).map(({ id, name, logo }) => ({ id, name, logo }));
}

/**
 * Offres de streaming à jour pour des films affichés : les inconnues sont récupérées tout de suite,
 * les vieilles d'une semaine sont renvoyées pour être rafraîchies après la réponse (voir after()).
 */
export async function withFreshOffers<F extends Pick<Film, "tmdbId" | "providersAt">>(films: F[]) {
  const missing = films.filter((f) => !f.providersAt).map((f) => f.tmdbId);
  const refreshed = missing.length ? await ensureManyDetails(missing, 8, true) : new Map<number, Film>();
  const stale = films.filter((f) => f.providersAt && providersStale(f)).map((f) => f.tmdbId);
  return { refreshed, refreshLater: () => (stale.length ? ensureManyDetails(stale, 4, true) : undefined) };
}
