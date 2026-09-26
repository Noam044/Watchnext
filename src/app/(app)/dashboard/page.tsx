import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { DashboardActions } from "@/components/dashboard-actions";
import { FullImportReminder } from "@/components/full-import-reminder";
import { ArrowRightIcon } from "@/components/icons";
import { RecoProgramme, type RecoItem } from "@/components/reco-grid";
import { SyncStatus } from "@/components/sync-status";
import { getI18n } from "@/i18n/server";
import { formatNumber } from "@/i18n/format";
import { prisma } from "@/lib/db";
import { describeStoredError } from "@/lib/errors";
import { getLocalizer } from "@/lib/localize";
import { becauseTitles, localizeFilms } from "@/lib/film-locale";
import { refs } from "@/lib/films";
import { offersFor } from "@/lib/providers";
import { FILTERS_COOKIE, matchesFilters, parseFilters } from "@/lib/reco-filters";
import { requireUser } from "@/lib/session";
import { getStreamingPrefs, providerCatalog, withFreshOffers } from "@/lib/streaming";
import { getTrailerKey } from "@/lib/tmdb";
import {
  AUTO_SYNC_INTERVAL,
  EXPORT_REMINDER_COOKIE,
  claimSync,
  getSyncState,
  isFullImportStale,
  runClaimedSync,
} from "@/lib/sync";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.dashboard.meta };
}
export const maxDuration = 60;

export default async function DashboardPage() {
  const user = await requireUser();

  // Synchronisation automatique du journal Letterboxd (au plus toutes les 6 h), lancée
  // après l'envoi de la page pour ne pas la ralentir ; SyncStatus suit son avancement.
  const syncUsername = await claimSync(user.id, AUTO_SYNC_INTERVAL);
  if (syncUsername) after(() => runClaimedSync(user.id, syncUsername));

  const [watchedCount, libraryCount, recos, hiddenCount, sync, cookieStore, { t, locale }, prefs] = await Promise.all([
    prisma.userFilm.count({ where: { userId: user.id, watched: true } }),
    prisma.userFilm.count({ where: { userId: user.id } }),
    prisma.recommendation.findMany({
      where: { userId: user.id, hidden: false },
      orderBy: { score: "desc" },
      include: { film: true },
    }),
    prisma.recommendation.count({ where: { userId: user.id, hidden: true } }),
    getSyncState(user.id),
    cookies(),
    getI18n(),
    getStreamingPrefs(user.id),
  ]);
  const loc = await getLocalizer(locale);
  const d = t.dashboard;
  const rssOnly = !!sync.lastRssSync && !sync.lastImportAt;
  const exportStale = isFullImportStale(sync.lastImportAt) && !cookieStore.has(EXPORT_REMINDER_COOKIE);

  if (libraryCount === 0) redirect("/import?welcome=1");

  // Où voir chaque film : les offres inconnues sont chargées maintenant, les anciennes après la réponse.
  const { refreshed, refreshLater } = await withFreshOffers(recos.map((r) => r.film));
  after(refreshLater);
  // Titres et synopsis dans la langue de l'interface, y compris ceux cités dans les raisons.
  localizeFilms(recos, locale);
  localizeFilms(refreshed, locale);
  type Details = { tags?: string[]; pct?: number; because?: string[]; becauseIds?: number[] };
  const because = await becauseTitles(
    recos.map((r) => (r.details ?? {}) as Details),
    locale,
  );
  const watchlist = new Set(
    (
      await prisma.userFilm.findMany({
        where: { userId: user.id, inWatchlist: true, watched: false, filmId: { in: recos.map((r) => r.filmId) } },
        select: { filmId: true },
      })
    ).map((w) => w.filmId),
  );

  const items: RecoItem[] = recos.map((r) => {
    const film = refreshed.get(r.film.tmdbId) ?? r.film;
    const details = (r.details ?? {}) as Details;
    const text = loc.reco(r.reason, details.tags ?? [], because(details));
    return {
      id: r.id,
      tmdbId: film.tmdbId,
      title: film.title,
      year: film.year,
      posterPath: film.posterPath,
      backdropPath: film.backdropPath,
      overview: film.overview,
      genres: refs(film.genres).map(loc.genre),
      directors: refs(film.directors).map((d) => d.name),
      voteAverage: film.voteAverage,
      runtime: film.runtime,
      language: film.originalLanguage,
      inWatchlist: watchlist.has(r.filmId),
      offers: offersFor(film.providers, prefs.region),
      reason: text.reason,
      tags: text.tags,
      pct: details.pct ?? 0,
    };
  });

  const filters = parseFilters(cookieStore.get(FILTERS_COOKIE)?.value);
  const shownIds = new Set([...items.flatMap((i) => i.offers?.stream ?? []), ...prefs.providers]);
  const catalog = await providerCatalog(prefs.region, shownIds);

  // Bande-annonce du film à l'affiche avec les filtres enregistrés (réponse TMDB mise en cache) ;
  // les autres sont demandées au clic.
  const first = items.find((i) => matchesFilters(i, filters, prefs.providers));
  const featureTrailer = first
    ? { tmdbId: first.tmdbId, key: await getTrailerKey(first.tmdbId).catch(() => null) }
    : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{d.showingFor(user.name ?? `@${user.handle}`)}</p>
          <p className="mt-1.5 text-sm text-dust-300">
            {d.basedOn(formatNumber(watchedCount, locale))}{" "}
            <Link
              href="/profile"
              className="inline-flex items-center gap-1 text-screen underline-offset-4 hover:underline"
            >
              {d.seeTaste} <ArrowRightIcon className="size-3.5" />
            </Link>
          </p>
          {sync.username && (
            <div className="mt-1.5">
              <SyncStatus
                initial={{
                  running: sync.running,
                  lastRssSync: sync.lastRssSync?.toISOString() ?? null,
                  error: describeStoredError(sync.error, t),
                }}
              />
            </div>
          )}
        </div>
        <DashboardActions username={sync.username} hiddenCount={hiddenCount} />
      </div>

      {rssOnly && <FullImportReminder kind="rss-only" filmCount={watchedCount} />}
      {exportStale && sync.lastImportAt && <FullImportReminder kind="stale" lastImportAt={sync.lastImportAt} />}

      {items.length > 0 ? (
        <RecoProgramme
          items={items}
          featureTrailer={featureTrailer}
          catalog={catalog}
          myProviders={prefs.providers}
          initialFilters={filters}
        />
      ) : (
        <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="marquee text-4xl">{d.emptyTitle}</p>
          <p className="max-w-md text-sm text-dust-300">{watchedCount < 3 ? d.emptyNotEnough : d.emptyRecalc}</p>
          {watchedCount < 3 && (
            <Link href="/import" className="btn-primary mt-2">
              {d.importHistory}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
