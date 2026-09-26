import "server-only";
import type { Locale } from "@/i18n/config";
import { prisma } from "@/lib/db";
import { localizeFilms } from "@/lib/film-locale";
import { language, trending } from "@/lib/tmdb";

export type ShowcaseFilm = {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
};

/** Films à l'affiche cette semaine (TMDB), avec repli sur les films déjà en base. */
export async function getShowcaseFilms(locale: Locale): Promise<ShowcaseFilm[]> {
  try {
    const items = await trending(language().startsWith(locale) ? language() : "en-US");
    const films = items
      .filter((i) => i.poster_path && !i.adult)
      .map((i) => ({
        tmdbId: i.id,
        title: i.title,
        year: i.release_date ? Number(i.release_date.slice(0, 4)) : null,
        posterPath: i.poster_path,
        backdropPath: i.backdrop_path ?? null,
      }));
    if (films.length >= 8) return films;
  } catch {
    // TMDB indisponible : on se rabat sur le cache local.
  }
  const films = await prisma.film.findMany({
    where: { posterPath: { not: null } },
    orderBy: { popularity: "desc" },
    take: 20,
    select: { tmdbId: true, title: true, titleEn: true, year: true, posterPath: true, backdropPath: true },
  });
  return localizeFilms(films, locale).map((f) => ({
    tmdbId: f.tmdbId,
    title: f.title,
    year: f.year,
    posterPath: f.posterPath,
    backdropPath: f.backdropPath,
  }));
}

/** Un film différent chaque jour : l'écran change sans clignoter à chaque visite. */
export function filmOfTheDay(films: ShowcaseFilm[]) {
  const withBackdrop = films.filter((f) => f.backdropPath);
  return withBackdrop.length ? withBackdrop[Math.floor(Date.now() / 86_400_000) % withBackdrop.length] : null;
}
