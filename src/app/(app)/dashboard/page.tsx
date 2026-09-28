import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { DashboardActions } from "@/components/dashboard-actions";
import { FullImportReminder } from "@/components/full-import-reminder";
import { ArrowRightIcon } from "@/components/icons";
import { RecoProgramme, type RecoItem } from "@/components/reco-grid";
import { SeenCount } from "@/components/seen-count";
import { SyncStatus } from "@/components/sync-status";
import { getI18n } from "@/i18n/server";
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

/** Champs des films du programme : ceux affichés, sans les mots-clés, la distribution ni les autres pays. */
const programmeFilmSelect = {
  tmdbId: true,
  title: true,
  titleEn: true,
  year: true,
  posterPath: true,
  backdropPath: true,
  overview: true,
  overviewEn: true,
  genres: true,
  directors: true,
  voteAverage: true,
  runtime: true,
  originalLanguage: true,
  providers: true,
  providersAt: true,
} as const;

export default async function DashboardPage() {
  const user = await requireUser();

  // Toutes les lectures indépendantes partent ensemble ; la watchlist vient avec les films du programme.
  const [syncUsername, watchedCount, libraryCount, recos, hiddenCount, sync, cookieStore, { t, locale }, prefs] =
    await Promise.all([
      // Synchronisation automatique du journal Letterboxd (au plus toutes les 6 h), réservée ici puis
      // lancée après l'envoi de la page pour ne pas la ralentir ; SyncStatus suit son avancement.
      claimSync(user.id, AUTO_SYNC_INTERVAL),
      prisma.userFilm.count({ where: { userId: user.id, watched: true } }),
      prisma.userFilm.count({ where: { userId: user.id } }),
      prisma.recommendation.findMany({
        where: { userId: user.id, hidden: false },
        orderBy: { score: "desc" },
        select: {
          id: true,
          reason: true,
          details: true,
          film: {
            select: {
              ...programmeFilmSelect,
              userFilms: { where: { userId: user.id }, select: { inWatchlist: true, watched: true } },
            },
          },
        },
      }),
      prisma.recommendation.count({ where: { userId: user.id, hidden: true } }),
      getSyncState(user.id),
      cookies(),
      getI18n(),
      getStreamingPrefs(user.id),
    ]);
  if (syncUsername) after(() => runClaimedSync(user.id, syncUsername));
  if (libraryCount === 0) redirect("/import?welcome=1");
  // L'état a été lu en même temps que la réservation : une synchronisation réservée à l'instant est en cours.
  const syncRunning = sync.running || !!syncUsername;

  const d = t.dashboard;
  const rssOnly = !!sync.lastRssSync && !sync.lastImportAt;
  const exportStale = isFullImportStale(sync.lastImportAt) && !cookieStore.has(EXPORT_REMINDER_COOKIE);
  // Phrase « … tes N films vus » coupée autour du nombre, qui devient un compteur animé.
  const [basedOnBefore, basedOnAfter] = d.basedOn("\u0000").split("\u0000");

  type Details = { tags?: string[]; pct?: number; because?: string[]; becauseIds?: number[] };
  const allProviders = providerCatalog(prefs.region);
  const [loc, { refreshed, refreshLater }, because] = await Promise.all([
    getLocalizer(locale),
    // Où voir chaque film : les offres inconnues sont chargées maintenant, les anciennes après la réponse.
    withFreshOffers(recos.map((r) => r.film)),
    // Titres des films cités dans les raisons, dans la langue de l'interface.
    becauseTitles(
      recos.map((r) => (r.details ?? {}) as Details),
      locale,
    ),
  ]);
  after(refreshLater);
  // Titres et synopsis dans la langue de l'interface.
  localizeFilms(recos, locale);
  localizeFilms(refreshed, locale);

  const items: RecoItem[] = recos.map((r) => {
    const film = refreshed.get(r.film.tmdbId) ?? r.film;
    const details = (r.details ?? {}) as Details;
    const text = loc.reco(r.reason, details.tags ?? [], because(details));
    const mine = r.film.userFilms[0];
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
      inWatchlist: !!mine?.inWatchlist && !mine.watched,
      offers: offersFor(film.providers, prefs.region),
      reason: text.reason,
      tags: text.tags,
      pct: details.pct ?? 0,
    };
  });

  const filters = parseFilters(cookieStore.get(FILTERS_COOKIE)?.value);
  const shownIds = new Set([...items.flatMap((i) => i.offers?.stream ?? []), ...prefs.providers]);
  const catalog = (await allProviders).filter((p) => shownIds.has(p.id));

  // Bande-annonce du film à l'affiche avec les filtres enregistrés (réponse TMDB mise en cache) : envoyée
  // au navigateur dès qu'elle est prête, sans retarder la page ; les autres sont demandées au clic.
  const first = items.find((i) => matchesFilters(i, filters, prefs.providers));
  const featureTrailer = first
    ? { tmdbId: first.tmdbId, key: getTrailerKey(first.tmdbId).catch(() => null) }
    : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {/* Sur téléphone, l'en-tête est centré au-dessus des boutons. */}
        <div className="max-sm:text-center max-sm:[&_p]:justify-center">
          <p className="eyebrow">{d.showingFor(user.name ?? `@${user.handle}`)}</p>
          <p className="mt-1.5 text-sm text-dust-300">
            {basedOnBefore}
            <SeenCount initial={watchedCount} />
            {basedOnAfter}{" "}
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
                  running: syncRunning,
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
