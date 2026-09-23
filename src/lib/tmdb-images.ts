export const IMAGE_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(path: string | null | undefined, size: "w185" | "w342" | "w500" | "w780" = "w342") {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}
