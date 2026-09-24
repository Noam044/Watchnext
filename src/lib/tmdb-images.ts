export const IMAGE_BASE = "https://image.tmdb.org/t/p";

// Affiches et images de fond utilisent des tailles distinctes : le chargeur d'images
// (tmdb-image-loader.ts) s'en sert pour reconnaître le type d'image.
export function posterUrl(path: string | null | undefined, size: "w185" | "w342" | "w500" = "w342") {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export function backdropUrl(path: string | null | undefined, size: "w300" | "w780" | "w1280" = "w1280") {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}
