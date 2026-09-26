import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { Avatar } from "@/components/avatar";
import { BackButton } from "@/components/back-button";
import { CutReveal } from "@/components/cut-reveal";
import { ExternalIcon, HeartIcon } from "@/components/icons";
import { Poster } from "@/components/poster";
import { ProviderLogos } from "@/components/provider-logos";
import { ReviewText } from "@/components/review-text";
import { FilmScreen } from "@/components/film-screen";
import { ShareFilmButton } from "@/components/share-film-button";
import { Stars } from "@/components/stars";
import { Ticket } from "@/components/ticket";
import { INTL } from "@/i18n/config";
import { dateFormat, formatNumber } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { getSameDirector } from "@/lib/activity";
import { avatarUrl } from "@/lib/avatar";
import { prisma } from "@/lib/db";
import { getLocalizer } from "@/lib/localize";
import { getFilmPage } from "@/lib/film-page";
import { refs } from "@/lib/films";
import { offersFor, type ProviderInfo } from "@/lib/providers";
import { requireUser } from "@/lib/session";
import { getStreamingPrefs, providerCatalog } from "@/lib/streaming";
import { getTrailerKey } from "@/lib/tmdb";
import { displayName } from "@/lib/users";

export const maxDuration = 30;

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: PageProps<"/film/[tmdbId]">): Promise<Metadata> {
  const id = parseId((await params).tmdbId);
  const film = id ? await prisma.film.findUnique({ where: { tmdbId: id }, select: { title: true, year: true } }) : null;
  return {
    title: film ? `${film.title}${film.year ? ` (${film.year})` : ""}` : (await getI18n()).t.filmPage.metaFallback,
  };
}

export default async function FilmPage({ params }: PageProps<"/film/[tmdbId]">) {
  const me = await requireUser();
  const id = parseId((await params).tmdbId);
  if (!id) notFound();
  const [data, trailerKey] = await Promise.all([getFilmPage(id, me.id), getTrailerKey(id).catch(() => null)]);
  if (!data) notFound();
  const { film, mine, reco, friends } = data;
  const [{ t, locale }, prefs] = await Promise.all([getI18n(), getStreamingPrefs(me.id)]);
  const fp = t.filmPage;
  const offers = offersFor(film.providers, prefs.region);
  const catalog = offers
    ? new Map(
        (await providerCatalog(prefs.region, [...offers.stream, ...offers.rent, ...offers.buy])).map((p) => [p.id, p]),
      )
    : new Map<number, ProviderInfo>();
  const streams = (offers?.stream ?? []).flatMap((id) => catalog.get(id) ?? []);
  const stores = [...new Set([...(offers?.rent ?? []), ...(offers?.buy ?? [])])].flatMap((id) => catalog.get(id) ?? []);
  const regionName = new Intl.DisplayNames(INTL[locale], { type: "region" }).of(prefs.region) ?? prefs.region;
  const loc = await getLocalizer(locale);
  const dateFmt = dateFormat(locale, { day: "numeric", month: "long", year: "numeric" });
  const score = (v: number) => formatNumber(v, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const genres = refs(film.genres).map(loc.genre);
  const directorRefs = refs(film.directors);
  const directors = directorRefs.map((d) => d.name);
  const sameDirector = directorRefs[0] ? await getSameDirector(film.id, directorRefs[0].id, me.id, 10) : [];
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
                <span className="font-bold">{recoPct} %</span> {t.film.pctForYou}
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
                directors[0] && t.film.directedBy(directors.join(", ")),
                film.runtime ? t.film.minutes(film.runtime) : null,
                film.voteAverage > 0 ? `TMDB ${score(film.voteAverage)}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
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

        <div className="mt-6 flex flex-wrap gap-2 px-1 sm:px-6">
          <ShareFilmButton tmdbId={film.tmdbId} title={film.title} />
          <a
            href={`https://letterboxd.com/tmdb/${film.tmdbId}/`}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
          >
            {t.common.seeOnLetterboxd} <ExternalIcon className="size-3.5" />
          </a>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-10">
          {reco && (
            <section aria-label={fp.whyLabel} className="rounded-lg border border-tungsten/30 bg-tungsten-soft p-5">
              <p className="eyebrow text-tungsten">{fp.recommended}</p>
              <p className="mt-2 text-base text-screen">
                {loc.reco(reco.reason, [], (reco.details as { because?: string[] } | null)?.because ?? []).reason}
              </p>
            </section>
          )}

          <section aria-labelledby="ton-avis" className="reveal space-y-3">
            <h2 id="ton-avis" className="marquee text-3xl">
              {fp.yourTake}
            </h2>
            {mine?.watched ? (
              <Ticket date={mine.watchedAt} locale={locale} undated={t.common.undated}>
                <div className="min-w-0 flex-1 space-y-3 py-1 pr-1">
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {mine.rating != null ? (
                      <Stars value={mine.rating} className="text-lg" />
                    ) : (
                      <span className="text-sm text-dust-300">{fp.watchedNoRating}</span>
                    )}
                    {mine.liked && (
                      <span className="inline-flex items-center gap-1 text-sm text-dust-300">
                        <HeartIcon className="size-4 text-curtain brightness-150" /> {fp.liked}
                      </span>
                    )}
                  </p>
                  {mine.review ? (
                    <ReviewText text={mine.review} spoilers={mine.reviewSpoilers} />
                  ) : (
                    <p className="text-sm text-dust-400">{fp.noReview}</p>
                  )}
                </div>
              </Ticket>
            ) : (
              <p className="text-sm text-dust-300">{mine?.inWatchlist ? fp.inWatchlist : fp.notSeen}</p>
            )}
          </section>

          {film.overview && (
            <section aria-labelledby="synopsis" className="reveal space-y-3">
              <h2 id="synopsis" className="marquee text-3xl">
                {fp.synopsis}
              </h2>
              <p className="max-w-prose text-base leading-relaxed text-screen/90">{film.overview}</p>
            </section>
          )}

          <section aria-labelledby="amis" className="reveal space-y-3">
            <h2 id="amis" className="marquee text-3xl">
              {fp.yourFriends}
              {friendsWatched.length > 0 && <span className="text-dust-400"> · {friendsWatched.length}</span>}
            </h2>
            {friendsWatched.length === 0 ? (
              <p className="text-sm text-dust-300">
                {fp.noFriendSaw}
                {friendsWatchlist.length > 0 &&
                  fp.inFriendsWatchlist(friendsWatchlist.map((f) => displayName(f.user)).join(", "))}
              </p>
            ) : (
              <ul className="space-y-3">
                {friendsWatched.map((f) => (
                  <li key={f.id}>
                    <Ticket date={f.watchedAt} locale={locale} undated={t.common.undated}>
                      <div className="min-w-0 flex-1 space-y-2.5 py-1 pr-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Link
                            href={`/u/${f.user.handle}`}
                            className="flex min-w-0 items-center gap-2.5 hover:text-tungsten"
                          >
                            <Avatar
                              name={displayName(f.user)}
                              handle={f.user.handle}
                              src={avatarUrl(f.user)}
                              size="sm"
                            />
                            <span className="truncate font-semibold">{displayName(f.user)}</span>
                          </Link>
                          <span className="flex shrink-0 items-center gap-2">
                            {f.rating != null && <Stars value={f.rating} />}
                            {f.liked && <HeartIcon className="size-3.5 text-curtain brightness-150" />}
                          </span>
                        </div>
                        {f.review && <ReviewText text={f.review} spoilers={f.reviewSpoilers} />}
                      </div>
                    </Ticket>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {sameDirector.length > 0 && (
            <section aria-labelledby="realisateur" className="reveal space-y-4">
              <div>
                <h2 id="realisateur" className="marquee text-3xl">
                  {fp.moreBy(directors[0])}
                </h2>
                <p className="mt-1 text-sm text-dust-300">{fp.moreByText}</p>
              </div>
              <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-5">
                {sameDirector.map((d) => (
                  <li key={d.id}>
                    <Link href={`/film/${d.tmdbId}`} className="group block">
                      <Poster
                        path={d.posterPath}
                        title={d.title}
                        size="w185"
                        sizes="(max-width: 640px) 30vw, 140px"
                        className={`ring-1 ring-white/5 transition group-hover:ring-screen/30 ${d.mine?.watched ? "" : "opacity-60 group-hover:opacity-100"}`}
                      />
                      <p className="mt-2 line-clamp-1 text-sm font-semibold group-hover:text-tungsten">{d.title}</p>
                    </Link>
                    <p className="mt-0.5 text-xs text-dust-400">
                      {d.year && `${d.year} · `}
                      {d.mine?.watched ? d.mine.rating != null ? <Stars value={d.mine.rating} /> : fp.seen : fp.unseen}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside aria-label={fp.credits} className="space-y-5 lg:pt-12">
          {offers && (
            <section aria-labelledby="ou-regarder" className="card p-4">
              <h2 id="ou-regarder" className="eyebrow">
                {fp.whereToWatch(regionName)}
              </h2>
              {streams.length || stores.length ? (
                <div className="mt-3 space-y-4">
                  {streams.length > 0 && (
                    <div>
                      <p className="text-xs text-dust-400">{fp.offerStream}</p>
                      <ul className="mt-2 space-y-2">
                        {streams.slice(0, 5).map((p) => (
                          <li key={p.id} className="flex items-center gap-2.5 text-sm">
                            <ProviderLogos providers={[p]} mine={prefs.providers} size={26} max={1} />
                            <span className="min-w-0 truncate">{p.name}</span>
                            {prefs.providers.includes(p.id) && (
                              <span className="meta ml-auto shrink-0 text-[11px] text-tungsten">
                                {fp.yourSubscription}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {stores.length > 0 && (
                    <div>
                      <p className="text-xs text-dust-400">{fp.offerRentBuy}</p>
                      <ProviderLogos providers={stores} size={26} max={7} className="mt-2 flex-wrap" />
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-dust-300">{fp.notOnline}</p>
              )}
              {prefs.providers.length === 0 && (
                <Link
                  href="/profile/edit#plateformes"
                  className="mt-4 block text-xs text-dust-300 underline-offset-4 hover:text-screen hover:underline"
                >
                  {fp.choosePlatforms}
                </Link>
              )}
              <p className="mt-4 flex items-center justify-between gap-2 border-t border-velvet-800 pt-3 text-[11px] text-dust-400">
                {offers.link ? (
                  <a
                    href={offers.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-screen"
                  >
                    {fp.seeOffers} <ExternalIcon className="size-3" />
                  </a>
                ) : (
                  <span />
                )}
                <a href="https://www.justwatch.com" target="_blank" rel="noreferrer" className="hover:text-screen">
                  {fp.justwatch}
                </a>
              </p>
            </section>
          )}
          <dl className="card divide-y divide-velvet-800 text-sm">
            {directors.length > 0 && (
              <div className="p-4">
                <dt className="eyebrow">{fp.direction}</dt>
                <dd className="mt-1">{directors.join(", ")}</dd>
              </div>
            )}
            {cast.length > 0 && (
              <div className="p-4">
                <dt className="eyebrow">{fp.cast}</dt>
                <dd className="mt-1 leading-relaxed">{cast.join(", ")}</dd>
              </div>
            )}
            {film.releaseDate && (
              <div className="p-4">
                <dt className="eyebrow">{fp.release}</dt>
                <dd className="mt-1">{dateFmt.format(new Date(`${film.releaseDate}T12:00:00Z`))}</dd>
              </div>
            )}
            {film.voteCount > 0 && (
              <div className="p-4">
                <dt className="eyebrow">{fp.tmdbRating}</dt>
                <dd className="mt-1">
                  {score(film.voteAverage)} / 10{" "}
                  <span className="meta">{fp.votes(formatNumber(film.voteCount, locale))}</span>
                </dd>
              </div>
            )}
          </dl>
        </aside>
      </div>
    </article>
  );
}
