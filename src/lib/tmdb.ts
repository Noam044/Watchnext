import "server-only";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createLimiter } from "@/lib/limit";
import type { Prisma } from "@/generated/prisma/client";

// Surchargeable pour les tests (serveur TMDB factice) ou un proxy.
const API = process.env.TMDB_API_BASE?.replace(/\/$/, "") || "https://api.themoviedb.org/3";

const DAY = 24 * 60 * 60 * 1000;

// TMDB tolère ~40 req/s ; on reste prudent au niveau du process.
const limit = createLimiter(8);

export type TmdbMovieListItem = {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  overview?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  adult?: boolean;
};

export type TmdbPage = {
  page: number;
  results: TmdbMovieListItem[];
  total_pages: number;
  total_results: number;
};

export type TmdbMovieDetails = Omit<TmdbMovieListItem, "genre_ids"> & {
  runtime: number | null;
  genres: { id: number; name: string }[];
  credits?: {
    cast: { id: number; name: string; order: number }[];
    crew: { id: number; name: string; job: string }[];
  };
  keywords?: { keywords: { id: number; name: string }[] };
};

function apiKey() {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) {
    throw new AppError("TMDB_AUTH", "La clé TMDB (TMDB_API_KEY) n'est pas configurée sur le serveur.", 500);
  }
  return key;
}

export function language() {
  return process.env.TMDB_LANGUAGE?.trim() || "fr-FR";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Appel brut à TMDB avec gestion du quota (429 + Retry-After), des erreurs
 * d'authentification et des pannes réseau. Retourne null pour un 404.
 */
async function request<T>(path: string, params: Record<string, string | number | undefined>): Promise<T | null> {
  const key = apiKey();
  const url = new URL(API + path);
  const headers: Record<string, string> = { accept: "application/json" };
  // Jeton v4 (JWT) -> Bearer, sinon clé v3 en query string.
  if (key.startsWith("eyJ")) headers.authorization = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    let res: Response;
    try {
      res = await limit(() => fetch(url, { headers, signal: AbortSignal.timeout(10_000), cache: "no-store" }));
    } catch {
      if (attempt < 2) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      throw new AppError("TMDB_UNAVAILABLE", "TMDB ne répond pas pour le moment. Réessaie dans quelques minutes.", 503);
    }

    if (res.ok) return (await res.json()) as T;
    if (res.status === 404) return null;
    if (res.status === 401) {
      throw new AppError("TMDB_AUTH", "La clé TMDB est invalide ou révoquée. Vérifie TMDB_API_KEY.", 500);
    }
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after")) || 2 ** attempt;
      if (attempt < 3 && retryAfter <= 10) {
        await sleep(retryAfter * 1000);
        continue;
      }
      throw new AppError(
        "TMDB_QUOTA",
        "Le quota de requêtes TMDB est atteint. Patiente une minute puis relance : la progression est conservée.",
        429,
      );
    }
    if (res.status >= 500 && attempt < 2) {
      await sleep(800 * (attempt + 1));
      continue;
    }
    throw new AppError("TMDB_UNAVAILABLE", `TMDB a renvoyé une erreur (${res.status}).`, 502);
  }
  throw new AppError("TMDB_UNAVAILABLE", "TMDB ne répond pas pour le moment.", 503);
}

/** Appel TMDB mis en cache dans la table TmdbCache. */
async function cached<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  ttlMs: number,
): Promise<T | null> {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const key = `${path}?${sorted}`;

  const hit = await prisma.tmdbCache.findUnique({ where: { key } });
  if (hit && hit.expiresAt > new Date()) return hit.data as T | null;

  const data = await request<T>(path, params);
  const json = (data ?? null) as Prisma.InputJsonValue;
  const expiresAt = new Date(Date.now() + (data ? ttlMs : DAY));
  await prisma.tmdbCache.upsert({
    where: { key },
    create: { key, data: json ?? {}, expiresAt },
    update: { data: json ?? {}, expiresAt },
  });
  return data;
}

export async function searchMovie(query: string, opts: { year?: number; primaryYear?: boolean } = {}) {
  const params: Record<string, string | number | undefined> = {
    query,
    language: language(),
    include_adult: "false",
  };
  if (opts.year) params[opts.primaryYear ? "primary_release_year" : "year"] = opts.year;
  const page = await cached<TmdbPage>("/search/movie", params, 30 * DAY);
  return page?.results ?? [];
}

export async function getRecommendations(tmdbId: number) {
  const page = await cached<TmdbPage>(`/movie/${tmdbId}/recommendations`, { language: language(), page: 1 }, 7 * DAY);
  return page?.results ?? [];
}

export async function getSimilar(tmdbId: number) {
  const page = await cached<TmdbPage>(`/movie/${tmdbId}/similar`, { language: language(), page: 1 }, 7 * DAY);
  return page?.results ?? [];
}

export async function discover(params: Record<string, string | number | undefined>) {
  const page = await cached<TmdbPage>(
    "/discover/movie",
    { language: language(), include_adult: "false", include_video: "false", ...params },
    2 * DAY,
  );
  return page?.results ?? [];
}

export async function getGenreMap(): Promise<Map<number, string>> {
  const res = await cached<{ genres: { id: number; name: string }[] }>(
    "/genre/movie/list",
    { language: language() },
    30 * DAY,
  );
  return new Map((res?.genres ?? []).map((g) => [g.id, g.name]));
}

/** Détails complets (non mis en cache ici : stockés dans la table Film). */
export function getMovieDetails(tmdbId: number) {
  return request<TmdbMovieDetails>(`/movie/${tmdbId}`, {
    language: language(),
    append_to_response: "credits,keywords",
  });
}
