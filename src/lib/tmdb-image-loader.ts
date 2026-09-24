"use client";

/**
 * Chargeur next/image : sert les images directement depuis le CDN de TMDB, dans
 * la taille TMDB la plus proche de la largeur demandée. Aucune optimisation côté
 * Vercel, donc aucun quota consommé, et un vrai srcset pour les écrans haute densité.
 */

// Tailles proposées par TMDB (https://developer.themoviedb.org/docs/image-basics).
const POSTER_WIDTHS = [92, 154, 185, 342, 500, 780];
const BACKDROP_WIDTHS = [300, 780, 1280];
// Tailles demandées par l'app pour les images de fond (voir backdropUrl) ; toutes les autres sont des affiches.
const BACKDROP_SIZES = new Set(["w300", "w780", "w1280"]);

const TMDB_IMAGE = /^https:\/\/image\.tmdb\.org\/t\/p\/(w\d+|original)(\/.+)$/;

export default function tmdbImageLoader({ src, width }: { src: string; width: number }) {
  const m = src.match(TMDB_IMAGE);
  if (!m) return src;
  const [, size, path] = m;
  const ladder = BACKDROP_SIZES.has(size) ? BACKDROP_WIDTHS : POSTER_WIDTHS;
  const best = ladder.find((w) => w >= width) ?? ladder[ladder.length - 1];
  return `https://image.tmdb.org/t/p/w${best}${path}`;
}
