"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { hideRecommendationAction, markSeenAction } from "@/actions/library";
import { EyeIcon, EyeOffIcon, ExternalIcon } from "@/components/icons";
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

  const act = (r: RecoItem, kind: "seen" | "hide") =>
    startTransition(async () => {
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
      <Feature r={feature} onAct={act} />

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
              <Card key={r.id} r={r} preload={i < 4} onAct={act} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type Act = (r: RecoItem, kind: "seen" | "hide") => void;

/** Le film n°1, projeté sur l'écran Cinémascope. */
function Feature({ r, onAct }: { r: RecoItem; onAct: Act }) {
  return (
    <section aria-label={`Ta séance : ${r.title}`} className="relative">
      <ScopeScreen backdropPath={r.backdropPath} posterPath={r.posterPath} alt="" preload animate key={r.id}>
        <div className="absolute inset-0 hidden bg-linear-to-t from-velvet-950/95 via-velvet-950/40 to-transparent md:block" />
        <div className="absolute inset-x-0 bottom-0 hidden p-8 md:block lg:p-10">
          <FeatureText r={r} onAct={onAct} />
        </div>
      </ScopeScreen>
      <div className="mt-5 md:hidden">
        <FeatureText r={r} onAct={onAct} />
      </div>
    </section>
  );
}

function FeatureText({ r, onAct }: { r: RecoItem; onAct: Act }) {
  return (
    <div className="max-w-3xl animate-rise [animation-delay:400ms]">
      <p className="eyebrow text-tungsten">
        Ta séance · <span className="font-bold">{r.pct} %</span> pour toi
      </p>
      <h1 className="marquee mt-2 text-5xl text-balance sm:text-6xl lg:text-7xl">
        {r.title}
      </h1>
      <p className="meta mt-3">
        {metaLine(r)}
        {r.genres.length > 0 && <span className="hidden sm:inline"> · {r.genres.slice(0, 3).join(", ")}</span>}
      </p>
      <p className="mt-3 max-w-xl text-base leading-snug text-screen/90">{r.reason}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <a href={letterboxdUrl(r.tmdbId)} target="_blank" rel="noreferrer" className="btn-primary">
          Voir sur Letterboxd <ExternalIcon className="size-3.5" />
        </a>
        <button onClick={() => onAct(r, "seen")} className="btn-ghost bg-velvet-950/40 backdrop-blur">
          <EyeIcon /> Déjà vu
        </button>
        <button onClick={() => onAct(r, "hide")} className="btn-quiet">
          <EyeOffIcon /> Pas pour moi
        </button>
      </div>
    </div>
  );
}

function Card({ r, preload, onAct }: { r: RecoItem; preload: boolean; onAct: Act }) {
  return (
    <li className="group flex flex-col">
      <a
        href={letterboxdUrl(r.tmdbId)}
        target="_blank"
        rel="noreferrer"
        className="relative block rounded-[5px] transition duration-300 group-hover:-translate-y-1"
        aria-label={`${r.title} sur Letterboxd`}
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
      </a>

      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="leading-snug font-semibold">{r.title}</h3>
        <p className="meta mt-1">{metaLine(r)}</p>
        <p className="mt-2 line-clamp-3 text-sm leading-snug text-dust-300">{r.reason}</p>
        <div className="mt-auto flex gap-1.5 pt-3">
          <button
            onClick={() => onAct(r, "seen")}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-velvet-700 py-1.5 text-xs text-dust-300 transition hover:border-velvet-600 hover:bg-velvet-800 hover:text-screen"
            title="Je l'ai déjà vu : l'ajouter à mes films vus"
          >
            <EyeIcon className="size-3.5" /> Déjà vu
          </button>
          <button
            onClick={() => onAct(r, "hide")}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-velvet-700 py-1.5 text-xs text-dust-300 transition hover:border-velvet-600 hover:bg-velvet-800 hover:text-screen"
            title="Ne plus me proposer ce film"
          >
            <EyeOffIcon className="size-3.5" /> Masquer
          </button>
        </div>
      </div>
    </li>
  );
}
