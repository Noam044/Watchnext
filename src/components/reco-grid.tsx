"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { hideRecommendationAction, markSeenAction } from "@/actions/library";
import { AnimatedNumber } from "@/components/animated-number";
import { CutReveal } from "@/components/cut-reveal";
import { EyeIcon, EyeOffIcon, ExternalIcon, InfoIcon, XIcon } from "@/components/icons";
import { Poster } from "@/components/poster";
import { ScopeScreen } from "@/components/scope-screen";
import { toast } from "@/components/toaster";

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
  reason: string;
  tags: string[];
  pct: number;
};

const letterboxdUrl = (tmdbId: number) => `https://letterboxd.com/tmdb/${tmdbId}/`;

function metaLine(r: RecoItem) {
  return [r.year, r.directors[0] && `Réal. ${r.directors[0]}`, r.runtime ? `${r.runtime} min` : null]
    .filter(Boolean)
    .join(" · ");
}

export function RecoProgramme({ items }: { items: RecoItem[] }) {
  const [optimistic, removeItem] = useOptimistic(items, (state, id: string) => state.filter((i) => i.id !== id));
  const [, startTransition] = useTransition();
  const [genre, setGenre] = useState<string | null>(null);
  const [sheet, setSheet] = useState<RecoItem | null>(null);

  const act = (r: RecoItem, kind: "seen" | "hide") =>
    startTransition(async () => {
      setSheet(null);
      removeItem(r.id);
      const res = kind === "seen" ? await markSeenAction(r.id) : await hideRecommendationAction(r.id);
      if (!res.ok) toast(res.error ?? "Action impossible.", "error");
      else toast(kind === "seen" ? `« ${r.title} » ajouté à tes films vus.` : `« ${r.title} » ne te sera plus proposé.`);
    });

  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of optimistic) for (const g of r.genres) counts.set(g, (counts.get(g) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 9);
  }, [optimistic]);

  if (optimistic.length === 0) {
    return (
      <div className="card p-10 text-center text-dust-300">
        Tu as fait le tour de cette sélection. Clique sur « Recalculer » pour en générer une nouvelle.
      </div>
    );
  }

  const activeGenre = genre && genres.some(([g]) => g === genre) ? genre : null;
  const [feature, ...rest] = optimistic;
  const programme = activeGenre ? rest.filter((r) => r.genres.includes(activeGenre)) : rest;

  return (
    <div className="space-y-14">
      <Feature r={feature} onAct={act} onOpen={setSheet} />

      {rest.length > 0 && (
        <section aria-labelledby="programme" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">{rest.length} autres films</p>
              <h2 id="programme" className="marquee mt-1 text-4xl sm:text-5xl">
                Le programme
              </h2>
            </div>
          </div>
          {genres.length > 1 && (
            <div role="group" aria-label="Filtrer par genre" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              <button onClick={() => setGenre(null)} className={`shrink-0 ${activeGenre ? "chip" : "chip-active"}`} aria-pressed={!activeGenre}>
                Tous
              </button>
              {genres.map(([g, n]) => (
                <button
                  key={g}
                  onClick={() => setGenre(activeGenre === g ? null : g)}
                  className={`shrink-0 ${activeGenre === g ? "chip-active" : "chip"}`}
                  aria-pressed={activeGenre === g}
                >
                  {g} <span className="font-mono text-[10px] opacity-70">{n}</span>
                </button>
              ))}
            </div>
          )}
          <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
            {programme.map((r, i) => (
              <Card key={r.id} r={r} preload={i < 4} onAct={act} onOpen={setSheet} />
            ))}
          </ul>
        </section>
      )}

      <FilmSheet r={sheet} onClose={() => setSheet(null)} onAct={act} />
    </div>
  );
}

type Act = (r: RecoItem, kind: "seen" | "hide") => void;
type Open = (r: RecoItem) => void;

/** Le film n°1, projeté sur l'écran Cinémascope. */
function Feature({ r, onAct, onOpen }: { r: RecoItem; onAct: Act; onOpen: Open }) {
  return (
    <section aria-label={`Ta séance : ${r.title}`} className="relative">
      <ScopeScreen backdropPath={r.backdropPath} posterPath={r.posterPath} alt="" preload animate key={r.id}>
        <div className="absolute inset-0 hidden bg-linear-to-t from-velvet-950/95 via-velvet-950/40 to-transparent md:block" />
        <div className="absolute inset-x-0 bottom-0 hidden p-8 md:block lg:p-10">
          <FeatureText r={r} onAct={onAct} onOpen={onOpen} />
        </div>
      </ScopeScreen>
      <div className="mt-5 md:hidden">
        <FeatureText r={r} onAct={onAct} onOpen={onOpen} />
      </div>
    </section>
  );
}

function FeatureText({ r, onAct, onOpen }: { r: RecoItem; onAct: Act; onOpen: Open }) {
  return (
    <div className="max-w-3xl">
      <p className="eyebrow text-tungsten">
        Ta séance · <AnimatedNumber value={r.pct} suffix=" %" delay={500} className="font-bold" /> pour toi
      </p>
      <h1 className="marquee mt-2 text-5xl text-balance sm:text-6xl lg:text-7xl">
        <CutReveal text={r.title} delay={450} />
      </h1>
      <p className="meta mt-3 animate-rise [animation-delay:800ms]">
        {metaLine(r)}
        {r.genres.length > 0 && <span className="hidden sm:inline"> · {r.genres.slice(0, 3).join(", ")}</span>}
      </p>
      <p className="mt-3 max-w-xl animate-rise text-base leading-snug text-screen/90 [animation-delay:900ms]">{r.reason}</p>
      <div className="mt-5 flex animate-rise flex-wrap gap-2 [animation-delay:1000ms]">
        <a href={letterboxdUrl(r.tmdbId)} target="_blank" rel="noreferrer" className="btn-primary">
          Voir sur Letterboxd <ExternalIcon className="size-3.5" />
        </a>
        <button onClick={() => onAct(r, "seen")} className="btn-ghost bg-velvet-950/40 backdrop-blur">
          <EyeIcon /> Déjà vu
        </button>
        <button onClick={() => onOpen(r)} className="btn-quiet">
          <InfoIcon /> Fiche du film
        </button>
        <button onClick={() => onAct(r, "hide")} className="btn-quiet">
          <EyeOffIcon /> Pas pour moi
        </button>
      </div>
    </div>
  );
}

function Card({ r, preload, onAct, onOpen }: { r: RecoItem; preload: boolean; onAct: Act; onOpen: Open }) {
  return (
    <li className="group flex flex-col">
      <button
        type="button"
        onClick={() => onOpen(r)}
        className="relative block cursor-pointer rounded-[5px] text-left transition duration-300 group-hover:-translate-y-1"
        aria-label={`Fiche de ${r.title}`}
      >
        <Poster
          path={r.posterPath}
          title={r.title}
          preload={preload}
          className="shadow-lg shadow-black/50 ring-1 ring-white/5 transition group-hover:shadow-[0_18px_50px_-12px_rgb(242_184_75/0.35)]"
        />
        <span className="absolute top-2 left-2 rounded-full bg-velvet-950/85 px-2 py-0.5 font-mono text-[11px] font-bold text-tungsten backdrop-blur">
          {r.pct} %
        </span>
        {r.overview && (
          <span className="pointer-events-none absolute inset-0 hidden flex-col justify-end rounded-[5px] bg-linear-to-t from-velvet-950 via-velvet-950/85 to-transparent p-3 opacity-0 transition group-hover:opacity-100 sm:flex">
            <span className="line-clamp-6 text-xs leading-relaxed text-dust-300">{r.overview}</span>
          </span>
        )}
      </button>

      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="leading-snug font-semibold">
          <button type="button" onClick={() => onOpen(r)} className="text-left hover:text-tungsten">
            {r.title}
          </button>
        </h3>
        <p className="meta mt-1">{metaLine(r)}</p>
        <p className="mt-2 line-clamp-3 text-sm leading-snug text-dust-300">{r.reason}</p>
        <div className="mt-auto -ml-2 flex gap-0.5 pt-2">
          <button
            onClick={() => onAct(r, "seen")}
            className="btn-quiet gap-1.5 px-2 py-1.5 text-xs"
            title="Je l'ai déjà vu : l'ajouter à mes films vus"
          >
            <EyeIcon className="size-3.5" /> Déjà vu
          </button>
          <button
            onClick={() => onAct(r, "hide")}
            className="btn-quiet gap-1.5 px-2 py-1.5 text-xs"
            title="Ne plus me proposer ce film"
          >
            <EyeOffIcon className="size-3.5" /> Masquer
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
      aria-label={r ? `Fiche de ${r.title}` : undefined}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-velvet-700 bg-velvet-900 p-0 text-screen shadow-2xl shadow-black/70 backdrop:bg-black/75 backdrop:backdrop-blur-sm open:animate-rise sm:m-auto sm:max-w-2xl sm:rounded-2xl"
    >
      {r && (
        <article>
          <ScopeScreen backdropPath={r.backdropPath} posterPath={r.posterPath} alt="" size="w780" glow={false} className="rounded-none">
            <div className="absolute inset-0 bg-linear-to-t from-velvet-900 via-velvet-900/30 to-transparent" />
            <form method="dialog" className="absolute top-3 right-3">
              <button className="grid size-9 place-items-center rounded-full bg-velvet-950/80 text-screen backdrop-blur hover:bg-velvet-800" aria-label="Fermer la fiche">
                <XIcon className="size-4" />
              </button>
            </form>
          </ScopeScreen>
          <div className="-mt-10 flex gap-4 px-5 pb-6 sm:-mt-14 sm:gap-5 sm:px-7 sm:pb-7">
            <Poster path={r.posterPath} title={r.title} size="w185" sizes="120px" className="relative w-20 shrink-0 shadow-xl shadow-black/60 ring-1 ring-white/10 sm:w-28" />
            <div className="min-w-0 pt-10 sm:pt-14">
              <p className="eyebrow text-tungsten">
                <span className="font-bold">{r.pct} %</span> pour toi
                {r.voteAverage > 0 && <span className="text-dust-400"> · TMDB {r.voteAverage.toFixed(1).replace(".", ",")}</span>}
              </p>
              <h2 className="marquee mt-1 text-4xl text-balance sm:text-5xl">{r.title}</h2>
              <p className="meta mt-2">{metaLine(r)}</p>
            </div>
          </div>
          <div className="space-y-5 border-t border-velvet-800 px-5 py-6 sm:px-7">
            <p className="text-base leading-snug text-screen">{r.reason}</p>
            {(r.genres.length > 0 || r.tags.length > 0) && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Genres et points communs">
                {r.tags.map((t) => (
                  <li key={t} className="chip-active cursor-default">{t}</li>
                ))}
                {r.genres.map((g) => (
                  <li key={g} className="chip cursor-default">{g}</li>
                ))}
              </ul>
            )}
            {r.overview ? (
              <p className="max-w-prose text-sm leading-relaxed text-dust-300">{r.overview}</p>
            ) : (
              <p className="text-sm text-dust-400">Pas de synopsis disponible pour ce film.</p>
            )}
          </div>
          <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-velvet-800 bg-velvet-900/95 px-5 py-4 backdrop-blur sm:px-7">
            <a href={letterboxdUrl(r.tmdbId)} target="_blank" rel="noreferrer" className="btn-primary">
              Voir sur Letterboxd <ExternalIcon className="size-3.5" />
            </a>
            <button onClick={() => onAct(r, "seen")} className="btn-ghost">
              <EyeIcon /> Déjà vu
            </button>
            <button onClick={() => onAct(r, "hide")} className="btn-quiet">
              <EyeOffIcon /> Pas pour moi
            </button>
          </div>
        </article>
      )}
    </dialog>
  );
}
