import Link from "next/link";
import { notFound } from "next/navigation";
import { Poster } from "@/components/poster";
import { ScopeScreen } from "@/components/scope-screen";
import { getI18n } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { localizeFilms } from "@/lib/film-locale";
import { refs } from "@/lib/films";
import { getLocalizer } from "@/lib/localize";

/**
 * Fiche d'un film pour un visiteur sans compte (lien partagé) : les informations publiques
 * du film et une invitation à rejoindre Watchnext. Seuls les films déjà connus sont affichés,
 * pour qu'un visiteur ne puisse pas déclencher d'appels à TMDB.
 */
export async function PublicFilm({ tmdbId }: { tmdbId: number }) {
  const { t, locale } = await getI18n();
  const film = localizeFilms(await prisma.film.findUnique({ where: { tmdbId } }), locale);
  if (!film) notFound();
  const fp = t.filmPage;
  const loc = await getLocalizer(locale);
  const directors = refs(film.directors).map((d) => d.name);
  const genres = refs(film.genres).map(loc.genre);
  const meta = [
    film.year,
    directors[0] && t.film.directedBy(directors.join(", ")),
    film.runtime ? t.film.minutes(film.runtime) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="space-y-10">
      <header>
        <ScopeScreen backdropPath={film.backdropPath} posterPath={film.posterPath} alt="" preload animate />
        <div className="relative flex gap-4 px-1 sm:gap-6 sm:px-6">
          <Poster
            path={film.posterPath}
            title={film.title}
            size="w342"
            sizes="(max-width: 640px) 112px, 176px"
            preload
            className="-mt-16 w-28 shrink-0 shadow-2xl shadow-black/70 ring-1 ring-white/10 sm:-mt-24 sm:w-44"
          />
          <div className="min-w-0 pt-3 sm:pt-5">
            <h1 className="marquee text-4xl text-balance sm:text-6xl">{film.title}</h1>
            {film.originalTitle && film.originalTitle !== film.title && (
              <p className="mt-1 text-sm text-dust-300 italic">{film.originalTitle}</p>
            )}
            {meta && <p className="meta mt-2">{meta}</p>}
            {genres.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={fp.genres}>
                {genres.map((g) => (
                  <li key={g} className="chip cursor-default">
                    {g}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {film.overview && (
            <section aria-labelledby="synopsis" className="space-y-3">
              <h2 id="synopsis" className="marquee text-3xl">
                {fp.synopsis}
              </h2>
              <p className="max-w-prose text-base leading-relaxed text-screen/90">{film.overview}</p>
            </section>
          )}
        </div>
        <aside className="card space-y-4 p-6 lg:-mt-2">
          <p className="marquee text-3xl">{fp.publicTitle}</p>
          <p className="text-sm leading-relaxed text-dust-300">{fp.publicText}</p>
          <div className="flex flex-col gap-2 pt-1">
            <Link href="/register" className="btn-primary">
              {t.landing.createAccount}
            </Link>
            <Link href="/login" className="btn-ghost">
              {t.landing.haveAccount}
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
