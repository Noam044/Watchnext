"use client";

import Link from "next/link";
import { ChevronDownIcon, ScreenIcon } from "@/components/icons";
import { INTL } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { RUNTIME_LIMITS, isFiltered, type RecoFilters } from "@/lib/reco-filters";

export type FilterOptions = {
  decades: [number, number][];
  langs: [string, number][];
  genres: [string, number][];
};

/** Barre de filtres du programme : plateformes, durée, époque, langue, genre, watchlist. */
export function RecoFiltersBar({
  filters,
  onChange,
  options,
  hasPlatforms,
  count,
}: {
  filters: RecoFilters;
  onChange: (next: RecoFilters) => void;
  options: FilterOptions;
  hasPlatforms: boolean;
  count: number;
}) {
  const { t, locale } = useI18n();
  const d = t.dashboard;
  const set = (patch: Partial<RecoFilters>) => onChange({ ...filters, ...patch });
  const languageName = (code: string) => {
    let name: string | undefined;
    try {
      name = new Intl.DisplayNames(INTL[locale], { type: "language" }).of(code);
    } catch {}
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : code;
  };

  return (
    // Sur téléphone, une grille de deux colonnes : tous les filtres sont visibles sans défiler.
    <div
      role="group"
      aria-label={d.filtersLabel}
      className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center max-sm:[&>*]:w-full max-sm:[&>*]:justify-center"
    >
      <span className="col-span-2 text-sm font-semibold text-dust-300 max-sm:text-center sm:mr-1">{d.tonight}</span>
      {hasPlatforms ? (
        <button
          type="button"
          onClick={() => set({ mine: !filters.mine })}
          aria-pressed={filters.mine}
          className={filters.mine ? "chip-active py-1.5" : "chip py-1.5"}
        >
          <ScreenIcon className="size-3.5" /> {d.onMyPlatforms}
        </button>
      ) : (
        <Link href="/profile/edit?section=plateformes" className="chip border-dashed py-1.5">
          <ScreenIcon className="size-3.5" /> {d.choosePlatforms}
        </Link>
      )}
      <FilterSelect
        label={d.runtimeLabel}
        value={String(filters.runtime)}
        onChange={(v) => set({ runtime: Number(v) })}
        options={[
          ["0", d.anyRuntime],
          ...RUNTIME_LIMITS.map((m): [string, string] => [String(m), d.runtimeUnder(t.film.hours(m))]),
        ]}
      />
      {options.decades.length > 1 && (
        <FilterSelect
          label={d.decadeLabel}
          value={filters.decade == null ? "" : String(filters.decade)}
          onChange={(v) => set({ decade: v ? Number(v) : null })}
          options={[
            ["", d.anyDecade],
            ...options.decades.map(([dec, n]): [string, string] => [String(dec), `${d.decade(dec)} (${n})`]),
          ]}
        />
      )}
      {options.langs.length > 1 && (
        <FilterSelect
          label={d.languageLabel}
          value={filters.lang ?? ""}
          onChange={(v) => set({ lang: v || null })}
          options={[
            ["", d.anyLanguage],
            ...options.langs.map(([code, n]): [string, string] => [code, `${languageName(code)} (${n})`]),
          ]}
        />
      )}
      {options.genres.length > 1 && (
        <FilterSelect
          label={d.genreLabel}
          value={filters.genre ?? ""}
          onChange={(v) => set({ genre: v || null })}
          options={[["", d.anyGenre], ...options.genres.map(([g, n]): [string, string] => [g, `${g} (${n})`])]}
        />
      )}
      <button
        type="button"
        onClick={() => set({ watchlist: !filters.watchlist })}
        aria-pressed={filters.watchlist}
        className={filters.watchlist ? "chip-active py-1.5" : "chip py-1.5"}
      >
        {d.inWatchlist}
      </button>
      {isFiltered(filters) && (
        <span className="col-span-2 flex items-center gap-2 sm:ml-auto">
          <span className="meta" aria-live="polite">
            {d.matching(count)}
          </span>
          <button
            type="button"
            onClick={() => onChange({ ...filters, ...RESET })}
            className="btn-quiet px-2 py-1 text-xs"
          >
            {d.resetFilters}
          </button>
        </span>
      )}
    </div>
  );
}

const RESET: Partial<RecoFilters> = {
  mine: false,
  runtime: 0,
  decade: null,
  lang: null,
  genre: null,
  watchlist: false,
};

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  const active = value !== options[0][0];
  return (
    <label className="relative inline-flex min-w-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${active ? "chip-active" : "chip bg-velvet-950"} w-full min-w-0 cursor-pointer appearance-none truncate py-1.5 pr-7 max-sm:justify-center max-sm:text-center max-sm:[text-align-last:center]`}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-dust-400" />
    </label>
  );
}
