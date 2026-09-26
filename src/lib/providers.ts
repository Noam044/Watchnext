/**
 * Où voir un film : offres de streaming, de location et d'achat par pays.
 * Les données viennent de JustWatch, via TMDB ; elles doivent être créditées à JustWatch.
 */

/** Pays proposés dans les réglages (codes ISO 3166-1). */
export const WATCH_REGIONS = ["FR", "BE", "CH", "LU", "CA", "GB", "IE", "US", "DE", "ES", "IT", "NL"] as const;
export type WatchRegion = (typeof WATCH_REGIONS)[number];

export function isWatchRegion(v: unknown): v is WatchRegion {
  return typeof v === "string" && (WATCH_REGIONS as readonly string[]).includes(v);
}

/** Offres d'un pays : identifiants de fournisseurs TMDB. `stream` regroupe abonnement, gratuit et gratuit avec pub. */
export type RegionOffers = { link?: string; stream: number[]; rent: number[]; buy: number[] };
export type FilmProviders = Partial<Record<WatchRegion, RegionOffers>>;

/** Fournisseur tel qu'affiché : nom et logo (chemin d'image TMDB). */
export type ProviderInfo = { id: number; name: string; logo: string | null };

/** Offres d'un film dans un pays, ou null si inconnues. */
export function offersFor(json: unknown, region: string): RegionOffers | null {
  if (!json || typeof json !== "object") return null;
  const r = (json as Record<string, RegionOffers | undefined>)[region];
  return r ?? { stream: [], rent: [], buy: [] };
}

/** Le film est-il inclus dans l'un de ces abonnements ? */
export function onMyPlatforms(offers: RegionOffers | null, mine: number[]) {
  return !!offers && offers.stream.some((id) => mine.includes(id));
}

export const JUSTWATCH_URL = "https://www.justwatch.com";
