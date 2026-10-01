import { refs, type NamedRef } from "@/lib/films";
import type { Film, UserFilm } from "@/generated/prisma/client";

/** Familles de caractéristiques utilisées pour décrire un film. */
export type FeatureType = "genre" | "director" | "cast" | "keyword" | "decade";
export const FEATURE_TYPES: FeatureType[] = ["genre", "director", "cast", "keyword", "decade"];

export type Feature = { type: FeatureType; id: number; name: string };

/** Nombre d'acteurs principaux pris en compte. */
const TOP_CAST = 5;

/** Champs d'un film utilisés par le profil de goûts. */
export type TasteFilm = Pick<Film, "genres" | "directors" | "cast" | "keywords" | "year">;
/** Sélection Prisma correspondante : évite de lire les lignes Film complètes (synopsis, offres…) pour un profil. */
export const tasteFilmSelect = { genres: true, directors: true, cast: true, keywords: true, year: true } as const;

export function filmFeatures(film: TasteFilm): Feature[] {
  const f: Feature[] = [];
  const add = (type: FeatureType, list: NamedRef[]) => {
    for (const r of list) f.push({ type, id: r.id, name: r.name });
  };
  add("genre", refs(film.genres));
  add("director", refs(film.directors));
  add("cast", refs(film.cast).slice(0, TOP_CAST));
  add("keyword", refs(film.keywords));
  if (film.year) {
    const decade = Math.floor(film.year / 10) * 10;
    f.push({ type: "decade", id: decade, name: `Années ${decade}` });
  }
  return f;
}

export const featureKey = (f: Pick<Feature, "type" | "id">) => `${f.type}:${f.id}`;

/**
 * Poids d'un film vu dans le profil, dérivé de la note Letterboxd (0,5 à 5) :
 * 5★ → +1, 4★ → +0,56, 3★ → +0,11, 2★ → -0,33, 0,5★ → -1.
 * Un like ajoute un bonus ; un film vu non noté compte faiblement.
 */
export function filmWeight(uf: Pick<UserFilm, "rating" | "liked">) {
  if (uf.rating != null) return (uf.rating - 2.75) / 2.25 + (uf.liked ? 0.35 : 0);
  return uf.liked ? 0.8 : 0.12;
}

export type TasteProfile = {
  /** Affinité normalisée dans [-1, 1] par caractéristique. */
  affinity: Map<string, number>;
  names: Map<string, string>;
  /** Nombre de films vus contenant la caractéristique. */
  counts: Map<string, number>;
  top: Record<FeatureType, { id: number; name: string; score: number; count: number }[]>;
};

type Rated = { film: TasteFilm; weight: number };

/**
 * Plancher de la normalisation : il faut environ deux films à 5★ partageant une caractéristique
 * pour qu'elle atteigne une affinité de 1. Sans lui, trois films vus sans note (poids 0,12)
 * donneraient un profil aussi tranché qu'une grande bibliothèque notée.
 */
const MIN_NORMALIZER = 1;

/**
 * Agrège les caractéristiques des films vus, pondérées par la note.
 * affinité brute = Σ poids / √(n + 2) : récompense la récurrence sans laisser
 * les caractéristiques ultra-fréquentes (ex. « Drame ») écraser le reste,
 * puis normalisation par le max absolu de chaque famille (au moins MIN_NORMALIZER).
 */
export function buildProfile(rated: Rated[]): TasteProfile {
  const sum = new Map<string, number>();
  const counts = new Map<string, number>();
  const names = new Map<string, string>();

  for (const { film, weight } of rated) {
    for (const f of filmFeatures(film)) {
      const k = featureKey(f);
      sum.set(k, (sum.get(k) ?? 0) + weight);
      counts.set(k, (counts.get(k) ?? 0) + 1);
      if (f.name) names.set(k, f.name);
    }
  }

  const raw = new Map<string, number>();
  const maxAbs = new Map<FeatureType, number>();
  for (const [k, s] of sum) {
    const v = s / Math.sqrt(counts.get(k)! + 2);
    raw.set(k, v);
    const t = k.split(":")[0] as FeatureType;
    maxAbs.set(t, Math.max(maxAbs.get(t) ?? 0, Math.abs(v)));
  }

  const affinity = new Map<string, number>();
  for (const [k, v] of raw) {
    const m = Math.max(maxAbs.get(k.split(":")[0] as FeatureType) ?? 0, MIN_NORMALIZER);
    affinity.set(k, v / m);
  }

  const top = Object.fromEntries(
    FEATURE_TYPES.map((t) => [
      t,
      [...affinity]
        .filter(([k, v]) => k.startsWith(`${t}:`) && v > 0 && (t === "genre" || t === "decade" || counts.get(k)! >= 2))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([k, v]) => ({ id: Number(k.split(":")[1]), name: names.get(k) ?? "", score: v, count: counts.get(k)! })),
    ]),
  ) as TasteProfile["top"];

  return { affinity, names, counts, top };
}

const clamp = (v: number, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, v));

/** Poids de chaque famille dans la proximité au profil. */
const TYPE_WEIGHTS: Record<FeatureType, number> = {
  genre: 0.28,
  keyword: 0.27,
  director: 0.2,
  cast: 0.15,
  decade: 0.1,
};

/**
 * Proximité d'un film avec le profil, dans [-1, 1].
 * Renvoie aussi le score par famille (utilisé pour les explications).
 */
export function profileSimilarity(profile: TasteProfile, features: Feature[]) {
  const byType = new Map<FeatureType, number[]>();
  for (const f of features) {
    const list = byType.get(f.type) ?? [];
    list.push(profile.affinity.get(featureKey(f)) ?? 0);
    byType.set(f.type, list);
  }

  const parts = {} as Record<FeatureType, number>;
  let total = 0;
  let weightSum = 0;
  for (const t of FEATURE_TYPES) {
    const vals = byType.get(t);
    if (!vals?.length) {
      parts[t] = 0;
      continue;
    }
    let s: number;
    switch (t) {
      case "genre":
      case "decade":
        s = vals.reduce((a, b) => a + b, 0) / vals.length;
        break;
      case "director":
        s = Math.max(...vals) > 0 ? Math.max(...vals) : Math.min(...vals);
        break;
      case "cast": {
        const sorted = [...vals].sort((a, b) => Math.abs(b) - Math.abs(a)).slice(0, 3);
        s = sorted.reduce((a, b) => a + b, 0) / 2;
        break;
      }
      case "keyword":
        // Beaucoup de mots-clés sont inconnus (0) : somme amortie plutôt que moyenne.
        s = vals.reduce((a, b) => a + b, 0) / Math.sqrt(vals.length);
        break;
    }
    parts[t] = clamp(s);
    total += TYPE_WEIGHTS[t] * parts[t];
    weightSum += TYPE_WEIGHTS[t];
  }
  // Films sans détails : on renormalise sur les familles connues.
  return { score: weightSum ? total / weightSum : 0, parts };
}
