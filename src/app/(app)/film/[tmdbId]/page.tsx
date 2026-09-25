import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { Avatar } from "@/components/avatar";
import { BackButton } from "@/components/back-button";
import { CutReveal } from "@/components/cut-reveal";
import { ExternalIcon, HeartIcon } from "@/components/icons";
import { Poster } from "@/components/poster";
import { ReviewText } from "@/components/review-text";
import { FilmScreen } from "@/components/film-screen";
import { ShareFilmButton } from "@/components/share-film-button";
import { Stars } from "@/components/stars";
import { prisma } from "@/lib/db";
import { getFilmPage } from "@/lib/film-page";
import { refs } from "@/lib/films";
import { requireUser } from "@/lib/session";
import { getTrailerKey } from "@/lib/tmdb";
import { displayName } from "@/lib/users";

export const maxDuration = 30;

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: PageProps<"/film/[tmdbId]">): Promise<Metadata> {
  const id = parseId((await params).tmdbId);
  const film = id ? await prisma.film.findUnique({ where: { tmdbId: id }, select: { title: true, year: true } }) : null;
  return { title: film ? `${film.title}${film.year ? ` (${film.year})` : ""}` : "Film" };
}

export default async function FilmPage({ params }: PageProps<"/film/[tmdbId]">) {
  const me = await requireUser();
  const id = parseId((await params).tmdbId);
  if (!id) notFound();
  const [data, trailerKey] = await Promise.all([getFilmPage(id, me.id), getTrailerKey(id).catch(() => null)]);
  if (!data) notFound();
  const { film, mine, reco, friends } = data;

  const genres = refs(film.genres).map((g) => g.name);
  const directors = refs(film.directors).map((d) => d.name);
  const cast = refs(film.cast).map((c) => c.name);
  const recoPct = (reco?.details as { pct?: number } | null)?.pct;
  const friendsWatched = friends.filter((f) => f.watched);
  const friendsWatchlist = friends.filter((f) => !f.watched && f.inWatchlist);

  return (
    <article className="space-y-10">
      <BackButton />

      <header>
        <FilmScreen
          backdropPath={film.backdropPath}
          posterPath={film.posterPath}
          tmdbId={film.tmdbId}
          title={film.title}
          trailerKey={trailerKey}
        />

        <div className="relative flex gap-4 px-1 sm:gap-6 sm:px-6">
          <ViewTransition name={`poster-${film.tmdbId}`} share="morph" default="none">
            <Poster
              path={film.posterPath}
              title={film.title}
              size="w342"
              sizes="(max-width: 640px) 112px, 176px"
              preload
              className="-mt-16 w-28 shrink-0 shadow-2xl shadow-black/70 ring-1 ring-white/10 sm:-mt-24 sm:w-44"
            />
          </ViewTransition>
          <div className="min-w-0 pt-3 sm:pt-5">
            {recoPct != null && (
              <p className="eyebrow text-tungsten">
                <span className="font-bold">{recoPct} %</span> pour toi
              </p>
            )}
            <h1 className="marquee mt-1 text-4xl text-balance sm:text-6xl">
              <CutReveal text={film.title} delay={350} />
            </h1>
            {film.originalTitle && film.originalTitle !== film.title && (
              <p className="mt-1 text-sm text-dust-300 italic">{film.originalTitle}</p>
            )}
            <p className="meta mt-2">
              {[
                film.year,
                directors[0] && `Réal. ${directors.join(", ")}`,
                film.runtime ? `${film.runtime} min` : null,
                film.voteAverage > 0 ? `TMDB ${film.voteAverage.toFixed(1).replace(".", ",")}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {genres.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Genres">
                {genres.map((g) => (
                  <li key={g} className="chip cursor-default">
                    {g}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 px-1 sm:px-6">
          <ShareFilmButton tmdbId={film.tmdbId} title={film.title} />
          <a href={`https://letterboxd.com/tmdb/${film.tmdbId}/`} target="_blank" rel="noreferrer" className="btn-ghost">
            Voir sur Letterboxd <ExternalIcon className="size-3.5" />
          </a>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-10">
          {reco && (
            <section aria-label="Pourquoi ce film" className="rounded-2xl border border-tungsten/30 bg-tungsten-soft p-5">
              <p className="eyebrow text-tungsten">Recommandé pour toi</p>
              <p className="mt-2 text-base text-screen">{reco.reason}</p>
            </section>
          )}

          <section aria-labelledby="ton-avis" className="reveal space-y-3">
            <h2 id="ton-avis" className="marquee text-3xl">
              Ton avis
            </h2>
            {mine?.watched ? (
              <div className="card space-y-3 p-5">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {mine.rating != null ? <Stars value={mine.rating} className="text-lg" /> : <span className="text-sm text-dust-300">Vu, sans note</span>}
                  {mine.liked && (
                    <span className="inline-flex items-center gap-1 text-sm text-dust-300">
                      <HeartIcon className="size-4 text-curtain brightness-150" /> Coup de cœur
                    </span>
                  )}
                  {mine.watchedAt && <span className="meta">Vu le {dateFmt.format(mine.watchedAt)}</span>}
                </p>
                {mine.review ? (
                  <ReviewText text={mine.review} spoilers={mine.reviewSpoilers} />
                ) : (
                  <p className="text-sm text-dust-400">Pas de critique écrite sur Letterboxd pour ce film.</p>
                )}
              </div>
            ) : (
              <p className="card p-5 text-sm text-dust-300">
                {mine?.inWatchlist ? "Dans ta watchlist : tu ne l'as pas encore vu." : "Tu n'as pas encore vu ce film."}
              </p>
            )}
          </section>

          {film.overview && (
            <section aria-labelledby="synopsis" className="reveal space-y-3">
              <h2 id="synopsis" className="marquee text-3xl">
                Synopsis
              </h2>
              <p className="max-w-prose text-base leading-relaxed text-screen/90">{film.overview}</p>
            </section>
          )}

          <section aria-labelledby="amis" className="reveal space-y-3">
            <h2 id="amis" className="marquee text-3xl">
              Tes amis{friendsWatched.length > 0 && <span className="text-dust-400"> · {friendsWatched.length}</span>}
            </h2>
            {friendsWatched.length === 0 ? (
              <p className="text-sm text-dust-300">
                Aucun de tes amis ne l&apos;a encore vu.
                {friendsWatchlist.length > 0 &&
                  ` Il est dans la watchlist de ${friendsWatchlist.map((f) => displayName(f.user)).join(", ")}.`}
              </p>
            ) : (
              <ul className="divide-y divide-velvet-800 rounded-2xl border border-velvet-800 bg-velvet-900/60">
                {friendsWatched.map((f) => (
                  <li key={f.id} className="space-y-3 p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <Link href={`/u/${f.user.handle}`} className="flex min-w-0 flex-1 items-center gap-3 hover:text-tungsten">
                        <Avatar name={displayName(f.user)} handle={f.user.handle} size="sm" />
                        <span className="truncate font-semibold">{displayName(f.user)}</span>
                      </Link>
                      <span className="flex shrink-0 items-center gap-2">
                        {f.rating != null && <Stars value={f.rating} />}
                        {f.liked && <HeartIcon className="size-3.5 text-curtain brightness-150" />}
                      </span>
                    </div>
                    {f.review && <ReviewText text={f.review} spoilers={f.reviewSpoilers} />}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside aria-label="Fiche technique" className="space-y-5 lg:pt-12">
          <dl className="card divide-y divide-velvet-800 text-sm">
            {directors.length > 0 && (
              <div className="p-4">
                <dt className="eyebrow">Réalisation</dt>
                <dd className="mt-1">{directors.join(", ")}</dd>
              </div>
            )}
            {cast.length > 0 && (
              <div className="p-4">
                <dt className="eyebrow">Avec</dt>
                <dd className="mt-1 leading-relaxed">{cast.join(", ")}</dd>
              </div>
            )}
            {film.releaseDate && (
              <div className="p-4">
                <dt className="eyebrow">Sortie</dt>
                <dd className="mt-1">{dateFmt.format(new Date(`${film.releaseDate}T12:00:00Z`))}</dd>
              </div>
            )}
            {film.voteCount > 0 && (
              <div className="p-4">
                <dt className="eyebrow">Note TMDB</dt>
                <dd className="mt-1">
                  {film.voteAverage.toFixed(1).replace(".", ",")} / 10{" "}
                  <span className="meta">({film.voteCount.toLocaleString("fr-FR")} votes)</span>
                </dd>
              </div>
            )}
          </dl>
        </aside>
      </div>
    </article>
  );
}
