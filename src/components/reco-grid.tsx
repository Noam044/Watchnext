"use client";

import { useOptimistic, useTransition } from "react";
import { hideRecommendationAction, markSeenAction } from "@/actions/library";
import { Poster } from "@/components/poster";

export type RecoItem = {
  id: string;
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  overview: string | null;
  genres: string[];
  directors: string[];
  voteAverage: number;
  runtime: number | null;
  reason: string;
  tags: string[];
  pct: number;
};

export function RecoGrid({ items }: { items: RecoItem[] }) {
  const [optimistic, removeItem] = useOptimistic(items, (state, id: string) => state.filter((i) => i.id !== id));
  const [, startTransition] = useTransition();

  const act = (id: string, fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      removeItem(id);
      const res = await fn();
      if (!res.ok) alert(res.error);
    });

  if (optimistic.length === 0) {
    return (
      <div className="card p-10 text-center text-ink-400">
        Plus aucune recommandation à afficher. Clique sur « Recalculer » pour en générer de nouvelles.
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {optimistic.map((r, i) => (
        <li key={r.id} className="group flex flex-col">
          <div className="relative">
            <Poster path={r.posterPath} title={r.title} priority={i < 4} className="shadow-lg shadow-black/40" />
            <span className="absolute top-2 left-2 rounded-full bg-ink-950/85 px-2 py-0.5 text-xs font-semibold text-accent backdrop-blur">
              {r.pct}%
            </span>
            {/* Survol (desktop) : synopsis */}
            {r.overview && (
              <div className="pointer-events-none absolute inset-0 hidden flex-col justify-end rounded-xl bg-gradient-to-t from-ink-950 via-ink-950/85 to-transparent p-3 opacity-0 transition group-hover:opacity-100 sm:flex">
                <p className="line-clamp-6 text-xs leading-relaxed text-ink-300">{r.overview}</p>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-1 flex-col">
            <h3 className="leading-snug font-medium">
              <a
                href={`https://letterboxd.com/tmdb/${r.tmdbId}/`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-accent"
              >
                {r.title}
              </a>
            </h3>
            <p className="mt-0.5 text-xs text-ink-400">
              {[r.year, r.directors[0], r.runtime ? `${r.runtime} min` : null].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-2 text-sm leading-snug text-ink-300">{r.reason}</p>
            {r.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.tags.map((t) => (
                  <span key={t} className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-auto flex gap-2 pt-3">
              <button
                onClick={() => act(r.id, () => markSeenAction(r.id))}
                className="flex-1 rounded-full border border-ink-700 px-2 py-1.5 text-xs text-ink-300 transition hover:border-ink-600 hover:bg-ink-800 hover:text-ink-100"
                title="Je l'ai déjà vu : le retirer et l'ajouter à mes films vus"
              >
                Déjà vu
              </button>
              <button
                onClick={() => act(r.id, () => hideRecommendationAction(r.id))}
                className="flex-1 rounded-full border border-ink-700 px-2 py-1.5 text-xs text-ink-300 transition hover:border-ink-600 hover:bg-ink-800 hover:text-ink-100"
                title="Ne plus me proposer ce film"
              >
                Masquer
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
