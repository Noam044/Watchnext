import Link from "next/link";
import { ViewTransition } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { HeartIcon, PencilIcon, SearchIcon, XIcon } from "@/components/icons";
import { Poster } from "@/components/poster";
import { Stars } from "@/components/stars";
import { Tilt } from "@/components/tilt";
import type { Film, UserFilm } from "@/generated/prisma/client";
import { dateFormat, formatNumber, formatRating } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import type { LibraryQuery, LibrarySort, LibraryTab } from "@/lib/profile";

const TABS: LibraryTab[] = ["rated", "watched", "liked", "watchlist"];
const SORTS: LibrarySort[] = ["recent", "rating", "title", "year"];

/** Bibliothèque Letterboxd d'un utilisateur : onglets, filtre par note, tri, recherche et pagination. */
export async function Library({
  basePath,
  query,
  counts,
  distribution,
  page,
  isSelf,
}: {
  basePath: string;
  query: LibraryQuery;
  counts: Record<LibraryTab, number>;
  distribution: { rating: number; count: number }[];
  page: { total: number; rows: (UserFilm & { film: Film })[]; pageCount: number };
  isSelf: boolean;
}) {
  const href = (over: Partial<LibraryQuery>) => {
    const q = { ...query, page: 1, ...over };
    const sp = new URLSearchParams();
    if (q.tab !== "rated") sp.set("tab", q.tab);
    if (q.sort !== "recent") sp.set("sort", q.sort);
    if (q.rating != null) sp.set("note", String(q.rating));
    if (q.q) sp.set("q", q.q);
    if (q.page > 1) sp.set("page", String(q.page));
    const s = sp.toString();
    return `${basePath}${s ? `?${s}` : ""}#films`;
  };
  const { t, locale } = await getI18n();
  const p = t.profile;
  const dateFmt = dateFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  const showRatings = query.tab !== "watchlist";
  const maxDist = Math.max(1, ...distribution.map((d) => d.count));
  const filtered = query.rating != null || !!query.q;

  return (
    <section id="films" aria-labelledby="films-title" className="scroll-mt-20 space-y-6">
      <h2 id="films-title" className="marquee text-4xl">
        {isSelf ? p.filmsSelf : p.filmsOther}
      </h2>

      <nav aria-label={p.categories} className="-mx-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-velvet-800 px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {TABS.map((tab) => {
          const active = query.tab === tab;
          return (
            <Link
              key={tab}
              href={href({ tab, rating: null })}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`relative shrink-0 px-3 pt-1 pb-3 text-sm font-medium transition ${
                active ? "text-screen" : "text-dust-400 hover:text-screen"
              }`}
            >
              {p.tabs[tab]} <span className="font-mono text-[11px] text-dust-400">{formatNumber(counts[tab], locale)}</span>
              {active && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-tungsten" />}
            </Link>
          );
        })}
      </nav>

      {/* Répartition des notes : chaque colonne filtre la liste */}
      {showRatings && distribution.some((d) => d.count > 0) && (
        <div>
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">{p.filterByRating}</p>
            {query.rating != null && (
              <Link href={href({ rating: null })} scroll={false} className="meta inline-flex items-center gap-1 hover:text-screen">
                <XIcon className="size-3" /> {p.allRatings}
              </Link>
            )}
          </div>
          <div className="mt-3 grid h-20 grid-cols-10 items-end gap-1 sm:gap-1.5">
            {distribution.map((d) => {
              const active = query.rating === d.rating;
              const dim = query.rating != null && !active;
              return (
                <Link
                  key={d.rating}
                  href={href({ rating: active ? null : d.rating })}
                  scroll={false}
                  aria-label={p.ratingBar(formatRating(d.rating, locale), d.count)}
                  aria-current={active ? "true" : undefined}
                  title={`${formatRating(d.rating, locale)}★ · ${p.filmsCount(d.count)}`}
                  className="group flex h-full flex-col justify-end"
                >
                  <span
                    className={`block rounded-t-[3px] transition ${
                      active ? "bg-tungsten" : dim ? "bg-velvet-700 group-hover:bg-velvet-600" : "bg-tungsten/60 group-hover:bg-tungsten"
                    }`}
                    style={{ height: `${Math.max(3, (d.count / maxDist) * 100)}%` }}
                  />
                </Link>
              );
            })}
          </div>
          <div className="mt-1.5 grid grid-cols-10 gap-1 text-center font-mono text-[10px] text-dust-400 sm:gap-1.5">
            {distribution.map((d) => (
              <span key={d.rating}>{Number.isInteger(d.rating) ? `${d.rating}★` : "½"}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form action={basePath} className="relative w-full sm:max-w-xs" role="search">
          {query.tab !== "rated" && <input type="hidden" name="tab" value={query.tab} />}
          {query.sort !== "recent" && <input type="hidden" name="sort" value={query.sort} />}
          {query.rating != null && <input type="hidden" name="note" value={query.rating} />}
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-dust-400" />
          <input
            name="q"
            type="search"
            defaultValue={query.q}
            placeholder={p.searchTitle}
            aria-label={p.searchTitle}
            className="input rounded-full py-2 pl-10"
          />
        </form>
        <div className="flex items-center gap-2">
          <span className="eyebrow">{p.sort}</span>
          <div className="flex rounded-full border border-velvet-700 p-0.5">
            {SORTS.filter((s) => showRatings || s !== "rating").map((s) => (
              <Link
                key={s}
                href={href({ sort: s })}
                scroll={false}
                aria-current={query.sort === s ? "true" : undefined}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  query.sort === s ? "bg-velvet-700 text-screen" : "text-dust-300 hover:text-screen"
                }`}
              >
                {p.sorts[s]}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {filtered && (
        <p className="meta">
          <AnimatedNumber value={page.total} /> {t.common.films(page.total)}
          {query.rating != null && p.ratedWith(formatRating(query.rating, locale))}
          {query.q && p.forQuery(query.q)} ·{" "}
          <Link href={href({ rating: null, q: "" })} scroll={false} className="underline-offset-4 hover:text-screen hover:underline">
            {p.clearFilters}
          </Link>
        </p>
      )}

      {page.rows.length > 0 ? (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-x-4 md:grid-cols-5 lg:grid-cols-6">
          {page.rows.map((uf) => (
            <li key={uf.id} className="group reveal min-w-0">
              <Link href={`/film/${uf.film.tmdbId}`} className="block">
                <Tilt className="rounded-[5px]">
                  <ViewTransition name={`poster-${uf.film.tmdbId}`} share="morph" default="none">
                    <Poster
                      path={uf.film.posterPath}
                      title={uf.film.title}
                      size="w185"
                      sizes="(max-width: 640px) 30vw, 160px"
                      className="ring-1 ring-white/5 transition duration-300 group-hover:ring-screen/25"
                    />
                  </ViewTransition>
                </Tilt>
                <p className="mt-2 truncate text-[13px] leading-tight font-medium group-hover:text-tungsten">{uf.film.title}</p>
              </Link>
              <p className="mt-1 flex items-center gap-1.5 text-xs">
                {showRatings && uf.rating != null && <Stars value={uf.rating} />}
                {uf.liked && <HeartIcon className="size-3 text-curtain brightness-150" />}
                {uf.review && (
                  <span title={t.film.criticWritten} aria-label={t.film.criticWritten}>
                    <PencilIcon className="size-3 text-dust-300" />
                  </span>
                )}
                <span className="meta truncate text-[11px]">
                  {query.sort === "recent" && uf.watchedAt ? dateFmt.format(uf.watchedAt) : (uf.film.year ?? "")}
                </span>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card px-6 py-10 text-center text-sm text-dust-300">
          {filtered ? p.noMatch : p.emptyCategory}
        </p>
      )}

      {page.pageCount > 1 && (
        <nav aria-label={p.pages} className="flex items-center justify-center gap-3 pt-2">
          {query.page > 1 ? (
            <Link href={href({ page: query.page - 1 })} scroll={false} className="btn-ghost px-4 py-2">
              {p.previous}
            </Link>
          ) : (
            <span className="btn border border-velvet-800 px-4 py-2 text-dust-400 opacity-50">{p.previous}</span>
          )}
          <span className="meta">
            {query.page} / {page.pageCount}
          </span>
          {query.page < page.pageCount ? (
            <Link href={href({ page: query.page + 1 })} scroll={false} className="btn-ghost px-4 py-2">
              {p.next}
            </Link>
          ) : (
            <span className="btn border border-velvet-800 px-4 py-2 text-dust-400 opacity-50">{p.next}</span>
          )}
        </nav>
      )}
    </section>
  );
}
