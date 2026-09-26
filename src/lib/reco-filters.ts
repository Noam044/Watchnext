import { onMyPlatforms, type RegionOffers } from "@/lib/providers";

/** Filtres du programme, gardés dans un cookie pour être retrouvés à la visite suivante. */
export const FILTERS_COOKIE = "wn_filters";

export type RecoFilters = {
  /** Seulement les films inclus dans mes abonnements. */
  mine: boolean;
  /** Durée maximale en minutes (0 : toutes). */
  runtime: number;
  /** Décennie de sortie (ex. 1990), ou null. */
  decade: number | null;
  /** Langue originale (ISO 639-1), ou null. */
  lang: string | null;
  /** Nom du genre (dans la langue de l'interface), ou null. */
  genre: string | null;
  watchlist: boolean;
};

export const NO_FILTERS: RecoFilters = {
  mine: false,
  runtime: 0,
  decade: null,
  lang: null,
  genre: null,
  watchlist: false,
};

/** Durées maximales proposées, en minutes. */
export const RUNTIME_LIMITS = [90, 105, 120, 150];

export type FilterableFilm = {
  runtime: number | null;
  year: number | null;
  language: string | null;
  genres: string[];
  inWatchlist: boolean;
  offers: RegionOffers | null;
};

export function matchesFilters(r: FilterableFilm, f: RecoFilters, myProviders: number[]) {
  if (f.mine && !onMyPlatforms(r.offers, myProviders)) return false;
  if (f.runtime && !(r.runtime && r.runtime <= f.runtime)) return false;
  if (f.decade != null && !(r.year && Math.floor(r.year / 10) * 10 === f.decade)) return false;
  if (f.lang && r.language !== f.lang) return false;
  if (f.genre && !r.genres.includes(f.genre)) return false;
  if (f.watchlist && !r.inWatchlist) return false;
  return true;
}

export function isFiltered(f: RecoFilters) {
  return f.mine || !!f.runtime || f.decade != null || !!f.lang || !!f.genre || f.watchlist;
}

/** Lecture tolérante du cookie : toute valeur inattendue retombe sur « aucun filtre ». */
export function parseFilters(raw: string | undefined): RecoFilters {
  if (!raw) return NO_FILTERS;
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as Partial<Record<keyof RecoFilters, unknown>>;
    const str = (x: unknown, max: number) => (typeof x === "string" && x.length > 0 && x.length <= max ? x : null);
    return {
      mine: v.mine === true,
      runtime: RUNTIME_LIMITS.includes(Number(v.runtime)) ? Number(v.runtime) : 0,
      decade:
        Number.isInteger(v.decade) && (v.decade as number) >= 1900 && (v.decade as number) <= 2100
          ? (v.decade as number)
          : null,
      lang: str(v.lang, 3),
      genre: str(v.genre, 40),
      watchlist: v.watchlist === true,
    };
  } catch {
    return NO_FILTERS;
  }
}

export function serializeFilters(f: RecoFilters) {
  return encodeURIComponent(JSON.stringify(f));
}
