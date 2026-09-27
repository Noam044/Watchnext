"use client";

import Link from "next/link";
import {
  ViewTransition,
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { hideRecommendationAction, markSeenAction } from "@/actions/library";
import { trailerKeyAction } from "@/actions/trailer";
import { AnimatedNumber } from "@/components/animated-number";
import { CutReveal } from "@/components/cut-reveal";
import { ArrowRightIcon, EyeIcon, EyeOffIcon, InfoIcon, PlayIcon, XIcon } from "@/components/icons";
import { Poster } from "@/components/poster";
import { ProviderLogos } from "@/components/provider-logos";
import { RecoFiltersBar, type FilterOptions } from "@/components/reco-filters-bar";
import { ScopeScreen } from "@/components/scope-screen";
import { Tilt } from "@/components/tilt";
import { toast } from "@/components/toaster";
import { TrailerFrame } from "@/components/trailer";
import { useI18n } from "@/i18n/client";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatList, formatNumber, joinMeta } from "@/i18n/format";
import { distinctProviders, onMyPlatforms, type ProviderInfo, type RegionOffers } from "@/lib/providers";
import { FILTERS_COOKIE, matchesFilters, serializeFilters, type RecoFilters } from "@/lib/reco-filters";

export type RecoItem = {
  id: string;
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  genres: string[];
  directors: string[];
  voteAverage: number;
  runtime: number | null;
  /** Langue originale (ISO 639-1). */
  language: string | null;
  inWatchlist: boolean;
  /** Offres de streaming dans le pays de l'utilisateur ; null si inconnues. */
  offers: RegionOffers | null;
  reason: string;
  tags: string[];
  pct: number;
};

function metaLine(r: RecoItem, t: Dictionary) {
  return joinMeta([
    r.year,
    r.directors[0] && t.film.directedBy(r.directors[0]),
    r.runtime ? t.film.minutes(r.runtime) : null,
  ]);
}

/** Plateformes connues (nom, logo) et abonnements de l'utilisateur, partagés par toutes les cartes. */
const Streaming = createContext<{ catalog: Map<number, ProviderInfo>; mine: number[] }>({
  catalog: new Map(),
  mine: [],
});

function useStreams(r: RecoItem) {
  const { catalog, mine } = use(Streaming);
  const providers = (r.offers?.stream ?? []).flatMap((id) => catalog.get(id) ?? []);
  return { providers, mine, onMine: onMyPlatforms(r.offers, mine) };
}

/** Films affichés dans le programme, puis à chaque clic sur « Afficher plus ». */
const PAGE = 20;

function counted<K>(keys: K[]) {
  const counts = new Map<K, number>();
  for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function RecoProgramme({
  items,
  featureTrailer = null,
  catalog,
  myProviders,
  initialFilters,
}: {
  items: RecoItem[];
  /** Bande-annonce déjà connue du film à l'affiche (avec les filtres enregistrés). */
  featureTrailer?: { tmdbId: number; key: string | null } | null;
  catalog: ProviderInfo[];
  myProviders: number[];
  initialFilters: RecoFilters;
}) {
  const [optimistic, removeItem] = useOptimistic(items, (state, id: string) => state.filter((i) => i.id !== id));
  const [, startTransition] = useTransition();
  const [filters, setFilters] = useState(initialFilters);
  const [limit, setLimit] = useState(PAGE);
  const [sheet, setSheet] = useState<RecoItem | null>(null);
  const { t } = useI18n();
  const streaming = useMemo(
    () => ({ catalog: new Map(catalog.map((p) => [p.id, p])), mine: myProviders }),
    [catalog, myProviders],
  );

  const act = (r: RecoItem, kind: "seen" | "hide") =>
    startTransition(async () => {
      setSheet(null);
      removeItem(r.id);
      const res = kind === "seen" ? await markSeenAction(r.id) : await hideRecommendationAction(r.id);
      if (!res.ok) toast(res.error ?? t.film.actionFailed, "error");
      else toast(kind === "seen" ? t.film.addedToWatched(r.title) : t.film.wontSuggest(r.title));
    });

  // Les filtres sont retenus pour la prochaine visite (cookie lu par le serveur au rendu de la page).
  const updateFilters = (next: RecoFilters) => {
    setFilters(next);
    setLimit(PAGE);
    document.cookie = `${FILTERS_COOKIE}=${serializeFilters(next)}; path=/; max-age=31536000; samesite=lax`;
  };

  const options: FilterOptions = useMemo(
    () => ({
      decades: counted(optimistic.flatMap((r) => (r.year ? [Math.floor(r.year / 10) * 10] : []))).sort(
        (a, b) => b[0] - a[0],
      ),
      langs: counted(optimistic.flatMap((r) => (r.language ? [r.language] : []))).slice(0, 10),
      genres: counted(optimistic.flatMap((r) => r.genres)).slice(0, 14),
    }),
    [optimistic],
  );

  if (optimistic.length === 0) {
    return <div className="card p-10 text-center text-dust-300">{t.dashboard.doneAll}</div>;
  }

  // Un filtre sur une valeur disparue (genre dans une autre langue, décennie vidée…) est ignoré.
  const effective: RecoFilters = {
    ...filters,
    genre: filters.genre && options.genres.some(([g]) => g === filters.genre) ? filters.genre : null,
    lang: filters.lang && options.langs.some(([l]) => l === filters.lang) ? filters.lang : null,
    decade: filters.decade != null && options.decades.some(([dec]) => dec === filters.decade) ? filters.decade : null,
    mine: filters.mine && myProviders.length > 0,
  };
  const shown = optimistic.filter((r) => matchesFilters(r, effective, myProviders));
  const [feature, ...rest] = shown;
  const page = rest.slice(0, limit);

  return (
    <Streaming value={streaming}>
      <div className="space-y-8">
        <RecoFiltersBar
          filters={effective}
          onChange={updateFilters}
          options={options}
          hasPlatforms={myProviders.length > 0}
          count={shown.length}
        />

        {!feature ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="marquee text-3xl">{t.dashboard.noMatchTitle}</p>
            <p className="max-w-md text-sm text-dust-300">{t.dashboard.noMatchText}</p>
          </div>
        ) : (
          <div className="space-y-14">
            <Feature
              key={feature.id}
              r={feature}
              trailerKey={featureTrailer?.tmdbId === feature.tmdbId ? featureTrailer.key : undefined}
              onAct={act}
            />

            {rest.length > 0 && (
              <section aria-labelledby="programme" className="space-y-6">
                <div className="max-sm:text-center">
                  <h2 id="programme" className="marquee text-4xl sm:text-5xl">
                    {t.dashboard.programme}
                    {/* Espaces insécables : le compteur ne passe pas seul à la ligne. */}
                    <span className="text-dust-400">{"\u00a0·\u00a0"}{rest.length}</span>
                  </h2>
                  <p className="mt-1.5 text-sm text-dust-300">{t.dashboard.programmeText}</p>
                </div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
                  {page.map((r, i) => (
                    <Card key={r.id} r={r} preload={i < 4} onAct={act} onOpen={setSheet} />
                  ))}
                </ul>
                {rest.length > limit && (
                  <div className="flex justify-center">
                    <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="btn-ghost">
                      {t.dashboard.showMore(Math.min(PAGE, rest.length - limit))}
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        <FilmSheet r={sheet} onClose={() => setSheet(null)} onAct={act} />
      </div>
    </Streaming>
  );
}

/** Où voir le film : logos des plateformes et phrase (« Inclus dans ton abonnement Netflix »). */
function StreamLine({ r, className = "" }: { r: RecoItem; className?: string }) {
  const { t, locale } = useI18n();
  const { providers, mine, onMine } = useStreams(r);
  if (providers.length === 0) {
    if (!r.offers || (r.offers.rent.length === 0 && r.offers.buy.length === 0)) return null;
    return <p className={`text-sm text-dust-400 ${className}`}>{t.film.rentOrBuy}</p>;
  }
  const names = distinctProviders(onMine ? providers.filter((p) => mine.includes(p.id)) : providers)
    .slice(0, 2)
    .map((p) => p.name);
  return (
    <p className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm ${onMine ? "text-screen" : "text-dust-300"} ${className}`}>
      <ProviderLogos providers={providers} mine={mine} size={22} max={3} />
      <span>
        {onMine ? t.film.onYourPlatform(formatList(names, locale)) : t.film.streamingOn(formatList(names, locale))}
      </span>
    </p>
  );
}

type Act = (r: RecoItem, kind: "seen" | "hide") => void;
type Open = (r: RecoItem) => void;

/**
 * Le film n°1 : projeté sur l'écran Cinémascope, avec son ticket de séance posé à cheval
 * sur le bas de l'écran. Le talon porte l'affinité, le corps le titre, la raison et les actions.
 */
function Feature({
  r,
  trailerKey: known,
  onAct,
}: {
  r: RecoItem;
  /** Clé YouTube connue (null : aucune bande-annonce) ; undefined : demandée au premier clic. */
  trailerKey: string | null | undefined;
  onAct: Act;
}) {
  const { t } = useI18n();
  const [trailerKey, setTrailerKey] = useState(known);
  const [playing, setPlaying] = useState(false);
  const [loading, startLoading] = useTransition();
  const close = useCallback(() => setPlaying(false), []);
  const play = () =>
    startLoading(async () => {
      const key = trailerKey === undefined ? await trailerKeyAction(r.tmdbId) : trailerKey;
      setTrailerKey(key);
      if (key) setPlaying(true);
      else toast(t.film.noTrailer, "error");
    });
  const onPlay = trailerKey !== null && !playing && !loading ? play : undefined;

  return (
    <section aria-label={t.film.sessionLabel(r.title)} className="group/feature relative">
      {playing && trailerKey ? (
        <TrailerFrame videoKey={trailerKey} title={r.title} onClose={close} />
      ) : (
        /* L'image se transforme en celle de la fiche du film (même nom de transition). */
        <ViewTransition name={`screen-${r.tmdbId}`} share="morph" default="none">
          <ScopeScreen
            backdropPath={r.backdropPath}
            posterPath={r.posterPath}
            alt=""
            preload
            animate
            className="group/screen cursor-pointer transition-shadow duration-500 hover:shadow-[0_0_0_1px_rgb(246_236_220/0.14),0_50px_160px_-30px_rgb(242_184_75/0.45),0_10px_40px_-10px_rgb(0_0_0/0.8)]"
            imageClassName="[transition:scale_6s_cubic-bezier(0.2,0.7,0.2,1),filter_0.7s_ease-out] group-hover/screen:scale-105 group-hover/screen:brightness-110"
          >
            {/* Tout l'écran ouvre la fiche du film. */}
            <Link href={`/film/${r.tmdbId}`} tabIndex={-1} aria-hidden className="absolute inset-0" />
            {/* Faisceau du projecteur qui balaie l'écran une fois au survol */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(100deg,transparent_35%,rgb(255_236_200/0.16)_50%,transparent_65%)] transition-transform duration-[1.4s] ease-out group-hover/screen:translate-x-full motion-reduce:hidden"
            />
            <span
              aria-hidden
              className="meta pointer-events-none absolute top-4 right-4 hidden -translate-y-2 items-center gap-1.5 rounded-md bg-velvet-950/80 px-3 py-1.5 text-screen opacity-0 transition duration-300 group-hover/screen:translate-y-0 group-hover/screen:opacity-100 md:inline-flex"
            >
              {t.film.seeFilm} <ArrowRightIcon className="size-3.5" />
            </span>
          </ScopeScreen>
        </ViewTransition>
      )}
      <FeatureTicket r={r} onAct={onAct} onPlay={onPlay} overlap={!playing} />
    </section>
  );
}

/** Ticket de la séance du jour. */
function FeatureTicket({
  r,
  onAct,
  onPlay,
  overlap,
}: {
  r: RecoItem;
  onAct: Act;
  onPlay?: () => void;
  overlap: boolean;
}) {
  const { t } = useI18n();
  return (
    // L'ombre est portée par le parent : le masque du ticket la découperait.
    <div className={`relative z-10 ${overlap ? "-mt-6 sm:mx-4 md:-mt-20 md:mx-8 lg:mx-12" : "mt-6"}`}>
      <div className="drop-shadow-[0_24px_40px_rgb(0_0_0/0.65)]">
        <div className="ticket flex animate-rise [--ticket-cut:4.75rem] [--ticket-notch:9px] [animation-delay:250ms] sm:[--ticket-cut:8rem] sm:[--ticket-notch:12px]">
          <div className="ticket-stub gap-1 py-5 sm:py-6">
            <span className="font-mono text-[10px] leading-tight tracking-[0.04em] uppercase opacity-70 sm:text-[11px] sm:tracking-[0.12em]">
              {t.film.session}
            </span>
            <span className="font-display text-3xl leading-none font-extrabold tabular-nums sm:text-6xl">
              <AnimatedNumber value={r.pct} delay={500} />
              <span className="text-xl sm:text-3xl">%</span>
            </span>
            <span className="font-mono text-[10px] opacity-70 sm:text-[11px]">{t.film.pctForYou}</span>
          </div>
          <div className="min-w-0 flex-1 p-4 sm:p-7 lg:p-8">
            <h1 className="marquee text-4xl text-balance transition-transform duration-500 ease-out group-hover/feature:-translate-y-0.5 sm:text-6xl lg:text-7xl">
              <Link href={`/film/${r.tmdbId}`} className="hover:text-tungsten">
                <CutReveal text={r.title} delay={450} />
              </Link>
            </h1>
            <p className="meta mt-3 animate-rise [animation-delay:800ms]">
              {metaLine(r, t)}
              {r.genres.length > 0 && <span className="hidden sm:inline"> · {r.genres.slice(0, 3).join(", ")}</span>}
            </p>
            <p className="mt-3 max-w-2xl animate-rise text-base leading-snug text-screen/90 [animation-delay:900ms]">
              {r.reason}
            </p>
            <StreamLine r={r} className="mt-3 animate-rise [animation-delay:950ms]" />
            <FeatureActions r={r} onAct={onAct} onPlay={onPlay} className="mt-5 hidden flex-wrap sm:flex" />
          </div>
        </div>
      </div>
      {/* Sur téléphone, le ticket est trop étroit : les actions passent dessous, en deux colonnes égales. */}
      <FeatureActions r={r} onAct={onAct} onPlay={onPlay} className="mt-4 grid grid-cols-2 sm:hidden" />
    </div>
  );
}

function FeatureActions({
  r,
  onAct,
  onPlay,
  className,
}: {
  r: RecoItem;
  onAct: Act;
  onPlay?: () => void;
  className: string;
}) {
  const { t } = useI18n();
  return (
    // Sans bande-annonce, la fiche du film occupe seule la première rangée de la grille (téléphone).
    <div className={`animate-rise gap-2 [animation-delay:1000ms] max-sm:[&>*]:px-3 ${className}`}>
      {onPlay && (
        <button onClick={onPlay} className="btn-primary">
          <PlayIcon className="size-3.5" /> {t.film.trailer}
        </button>
      )}
      <Link href={`/film/${r.tmdbId}`} className={onPlay ? "btn-ghost" : "btn-primary col-span-2"}>
        <InfoIcon /> {t.film.filmPage}
      </Link>
      {/* Sur écran moyen, « Déjà vu » et « Pas pour moi » passent à la ligne ensemble ; sur téléphone, cellules de la grille. */}
      <div className="contents sm:flex sm:gap-2">
        <button onClick={() => onAct(r, "seen")} className="btn-quiet">
          <EyeIcon /> {t.film.seen}
        </button>
        <button onClick={() => onAct(r, "hide")} className="btn-quiet">
          <EyeOffIcon /> {t.film.notForMe}
        </button>
      </div>
    </div>
  );
}

/** Logos des plateformes sous le titre d'une carte. */
function CardStreams({ r }: { r: RecoItem }) {
  const { providers, mine } = useStreams(r);
  return providers.length ? (
    <ProviderLogos providers={providers} mine={mine} size={20} max={3} className="mt-2" />
  ) : null;
}

function Card({ r, preload, onAct, onOpen }: { r: RecoItem; preload: boolean; onAct: Act; onOpen: Open }) {
  const { t } = useI18n();
  return (
    <li className="group reveal flex flex-col">
      <button
        type="button"
        onClick={() => onOpen(r)}
        className="relative block cursor-pointer rounded-[5px] text-left transition duration-300 group-hover:-translate-y-1"
        aria-label={t.film.detailsOf(r.title)}
      >
        <Tilt className="rounded-[5px]">
          <Poster
            path={r.posterPath}
            title={r.title}
            preload={preload}
            className="shadow-lg shadow-black/50 ring-1 ring-white/5 transition group-hover:ring-screen/25"
          />
          <span className="absolute top-2 left-2 rounded-sm bg-velvet-950/90 px-1.5 py-0.5 font-mono text-[11px] font-bold text-tungsten">
            {r.pct} %
          </span>
          {r.overview && (
            <span className="pointer-events-none absolute inset-0 hidden flex-col justify-end rounded-[5px] bg-linear-to-t from-velvet-950 via-velvet-950/85 to-transparent p-3 opacity-0 transition group-hover:opacity-100 sm:flex">
              <span className="line-clamp-6 text-xs leading-relaxed text-dust-300">{r.overview}</span>
            </span>
          )}
        </Tilt>
      </button>

      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="leading-snug font-semibold">
          <button type="button" onClick={() => onOpen(r)} className="text-left hover:text-tungsten">
            {r.title}
          </button>
        </h3>
        <p className="meta mt-1">{metaLine(r, t)}</p>
        <CardStreams r={r} />
        <p className="mt-2 line-clamp-3 text-sm leading-snug text-dust-300">{r.reason}</p>
        <div className="mt-auto -ml-2 flex gap-0.5 pt-2">
          <button
            onClick={() => onAct(r, "seen")}
            className="btn-quiet gap-1.5 px-2 py-1.5 text-xs"
            title={t.film.seenTitle}
          >
            <EyeIcon className="size-3.5" /> {t.film.seen}
          </button>
          <button
            onClick={() => onAct(r, "hide")}
            className="btn-quiet gap-1.5 px-2 py-1.5 text-xs"
            title={t.film.hideTitle}
          >
            <EyeOffIcon className="size-3.5" /> {t.film.hide}
          </button>
        </div>
      </div>
    </li>
  );
}

/**
 * Fiche d'un film : synopsis, genres, raison et actions. Panneau qui glisse du bas
 * sur mobile, fenêtre centrée sur écran large. <dialog> natif : focus piégé, Échap pour fermer.
 */
function FilmSheet({ r, onClose, onAct }: { r: RecoItem | null; onClose: () => void; onAct: Act }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (r && !dialog.open) dialog.showModal();
    if (!r && dialog.open) dialog.close();
  }, [r]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onKeyDown={(e) => {
        // Certains navigateurs embarqués ne transforment pas Échap en fermeture native.
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // clic sur le fond
      }}
      aria-label={r ? t.film.detailsOf(r.title) : undefined}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-lg border border-velvet-700 bg-velvet-900 p-0 text-screen shadow-2xl shadow-black/70 backdrop:bg-black/75 backdrop:backdrop-blur-sm open:animate-rise sm:m-auto sm:max-w-2xl sm:rounded-lg"
    >
      {r && <SheetBody key={r.id} r={r} onAct={onAct} />}
    </dialog>
  );
}

function SheetBody({ r, onAct }: { r: RecoItem; onAct: Act }) {
  // Bande-annonce : demandée au premier clic (undefined = pas encore demandée, null = aucune).
  const [trailer, setTrailer] = useState<string | null | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const [loading, startLoading] = useTransition();
  const close = useCallback(() => setPlaying(false), []);
  const { t, locale } = useI18n();

  const play = () =>
    startLoading(async () => {
      const key = trailer === undefined ? await trailerKeyAction(r.tmdbId) : trailer;
      setTrailer(key);
      if (key) setPlaying(true);
      else toast(t.film.noTrailer, "error");
    });

  return (
    <article>
      {playing && trailer ? (
        <div className="p-2">
          <TrailerFrame videoKey={trailer} title={r.title} onClose={close} />
        </div>
      ) : (
        <ScopeScreen
          backdropPath={r.backdropPath}
          posterPath={r.posterPath}
          alt=""
          size="w780"
          glow={false}
          className="rounded-none"
        >
          <div className="absolute inset-0 bg-linear-to-t from-velvet-900 via-velvet-900/30 to-transparent" />
          <form method="dialog" className="absolute top-3 right-3">
            <button
              className="grid size-9 place-items-center rounded-full bg-velvet-950/80 text-screen backdrop-blur hover:bg-velvet-800"
              aria-label={t.film.closeSheet}
            >
              <XIcon className="size-4" />
            </button>
          </form>
        </ScopeScreen>
      )}
      <div className="-mt-10 flex gap-4 px-5 pb-6 sm:-mt-14 sm:gap-5 sm:px-7 sm:pb-7">
        <Poster
          path={r.posterPath}
          title={r.title}
          size="w185"
          sizes="120px"
          className="relative w-20 shrink-0 shadow-xl shadow-black/60 ring-1 ring-white/10 sm:w-28"
        />
        <div className="min-w-0 pt-10 sm:pt-14">
          <p className="eyebrow text-tungsten">
            <span className="font-bold">{r.pct} %</span> {t.film.pctForYou}
            {r.voteAverage > 0 && (
              <span className="text-dust-400">
                {" "}
                · TMDB{" "}
                {formatNumber(r.voteAverage, locale, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </span>
            )}
          </p>
          <h2 className="marquee mt-1 text-4xl text-balance sm:text-5xl">{r.title}</h2>
          <p className="meta mt-2">{metaLine(r, t)}</p>
        </div>
      </div>
      <div className="space-y-5 border-t border-velvet-800 px-5 py-6 sm:px-7">
        <p className="text-base leading-snug text-screen">{r.reason}</p>
        <StreamLine r={r} />
        {(r.genres.length > 0 || r.tags.length > 0) && (
          <ul className="flex flex-wrap gap-1.5" aria-label={t.film.genresAndTags}>
            {r.tags.map((tag) => (
              <li key={tag} className="chip-active cursor-default">
                {tag}
              </li>
            ))}
            {r.genres.map((g) => (
              <li key={g} className="chip cursor-default">
                {g}
              </li>
            ))}
          </ul>
        )}
        {r.overview ? (
          <p className="max-w-prose text-sm leading-relaxed text-dust-300">{r.overview}</p>
        ) : (
          <p className="text-sm text-dust-400">{t.film.noSynopsis}</p>
        )}
      </div>
      {/* Téléphone : deux colonnes égales, au-dessus de la barre d'accueil de l'iPhone. */}
      <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-velvet-800 bg-velvet-900/95 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur max-sm:[&>*]:px-3 sm:flex sm:flex-wrap sm:px-7 sm:pb-4">
        <button onClick={play} disabled={loading || trailer === null} className="btn-primary">
          <PlayIcon className="size-3.5" /> {loading ? t.common.loading : t.film.trailer}
        </button>
        <Link href={`/film/${r.tmdbId}`} className="btn-ghost">
          {t.film.fullPage} <ArrowRightIcon className="size-3.5" />
        </Link>
        <button onClick={() => onAct(r, "seen")} className="btn-ghost">
          <EyeIcon /> {t.film.seen}
        </button>
        <button onClick={() => onAct(r, "hide")} className="btn-quiet">
          <EyeOffIcon /> {t.film.notForMe}
        </button>
      </div>
    </article>
  );
}
