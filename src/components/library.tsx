import Link from "next/link";
import { HeartIcon, SearchIcon, XIcon } from "@/components/icons";
import { Poster } from "@/components/poster";
import { Stars, formatRating } from "@/components/stars";
import type { Film, UserFilm } from "@/generated/prisma/client";
import type { LibraryQuery, LibrarySort, LibraryTab } from "@/lib/profile";

const TABS: { id: LibraryTab; label: string }[] = [
  { id: "rated", label: "Notes" },
  { id: "watched", label: "Vus" },
  { id: "liked", label: "Coups de cœur" },
  { id: "watchlist", label: "Watchlist" },
];

const SORTS: { id: LibrarySort; label: string }[] = [
  { id: "recent", label: "Récents" },
  { id: "rating", label: "Note" },
  { id: "title", label: "Titre" },
  { id: "year", label: "Année" },
];

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/** Bibliothèque Letterboxd d'un utilisateur : onglets, filtre par note, tri, recherche et pagination. */
export function Library({
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
  const showRatings = query.tab !== "watchlist";
  const maxDist = Math.max(1, ...distribution.map((d) => d.count));
  const filtered = query.rating != null || !!query.q;

  return (
    <section id="films" aria-labelledby="films-title" className="scroll-mt-20 space-y-6">
      <h2 id="films-title" className="marquee text-4xl">
        {isSelf ? "Tes films" : "Ses films"}
      </h2>

      <nav aria-label="Catégories" className="-mx-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-velvet-800 px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {TABS.map((t) => {
          const active = query.tab === t.id;
          return (
            <Link
              key={t.id}
              href={href({ tab: t.id, rating: null })}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`relative shrink-0 px-3 pt-1 pb-3 text-sm font-medium transition ${
                active ? "text-screen" : "text-dust-400 hover:text-screen"
              }`}
            >
              {t.label} <span className="font-mono text-[11px] text-dust-400">{counts[t.id].toLocaleString("fr-FR")}</span>
              {active && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-tungsten" />}
            </Link>
          );
        })}
      </nav>

      {/* Répartition des notes : chaque colonne filtre la liste */}
      {showRatings && distribution.some((d) => d.count > 0) && (
        <div>
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">Filtrer par note</p>
            {query.rating != null && (
              <Link href={href({ rating: null })} scroll={false} className="meta inline-flex items-center gap-1 hover:text-screen">
                <XIcon className="size-3" /> Toutes les notes
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
                  aria-label={`${formatRating(d.rating)} étoiles : ${d.count} films`}
                  aria-current={active ? "true" : undefined}
                  title={`${formatRating(d.rating)}★ · ${d.count} films`}
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
            placeholder="Chercher un titre"
            aria-label="Chercher un titre"
            className="input rounded-full py-2 pl-10"
          />
        </form>
        <div className="flex items-center gap-2">
          <span className="eyebrow">Trier</span>
          <div className="flex rounded-full border border-velvet-700 p-0.5">
            {SORTS.filter((s) => showRatings || s.id !== "rating").map((s) => (
              <Link
                key={s.id}
                href={href({ sort: s.id })}
                scroll={false}
                aria-current={query.sort === s.id ? "true" : undefined}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  query.sort === s.id ? "bg-velvet-700 text-screen" : "text-dust-300 hover:text-screen"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {filtered && (
        <p className="meta">
          {page.total.toLocaleString("fr-FR")} film{page.total > 1 ? "s" : ""}
          {query.rating != null && ` notés ${formatRating(query.rating)}★`}
          {query.q && ` pour « ${query.q} »`} ·{" "}
          <Link href={href({ rating: null, q: "" })} scroll={false} className="underline-offset-4 hover:text-screen hover:underline">
            effacer les filtres
          </Link>
        </p>
      )}

      {page.rows.length > 0 ? (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-x-4 md:grid-cols-5 lg:grid-cols-6">
          {page.rows.map((uf) => (
            <li key={uf.id} className="group min-w-0">
              <a href={`https://letterboxd.com/tmdb/${uf.film.tmdbId}/`} target="_blank" rel="noreferrer" className="block">
                <Poster
                  path={uf.film.posterPath}
                  title={uf.film.title}
                  size="w185"
                  sizes="(max-width: 640px) 30vw, 160px"
                  className="ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_14px_40px_-12px_rgb(242_184_75/0.35)]"
                />
                <p className="mt-2 truncate text-[13px] leading-tight font-medium group-hover:text-tungsten">{uf.film.title}</p>
              </a>
              <p className="mt-1 flex items-center gap-1.5 text-xs">
                {showRatings && uf.rating != null && <Stars value={uf.rating} />}
                {uf.liked && <HeartIcon className="size-3 text-curtain brightness-150" />}
                <span className="meta truncate text-[11px]">
                  {query.sort === "recent" && uf.watchedAt ? dateFmt.format(uf.watchedAt) : (uf.film.year ?? "")}
                </span>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card px-6 py-10 text-center text-sm text-dust-300">
          {filtered ? "Aucun film ne correspond à ces filtres." : "Aucun film dans cette catégorie pour l'instant."}
        </p>
      )}

      {page.pageCount > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-center gap-3 pt-2">
          {query.page > 1 ? (
            <Link href={href({ page: query.page - 1 })} scroll={false} className="btn-ghost px-4 py-2">
              Précédent
            </Link>
          ) : (
            <span className="btn border border-velvet-800 px-4 py-2 text-dust-400 opacity-50">Précédent</span>
          )}
          <span className="meta">
            {query.page} / {page.pageCount}
          </span>
          {query.page < page.pageCount ? (
            <Link href={href({ page: query.page + 1 })} scroll={false} className="btn-ghost px-4 py-2">
              Suivant
            </Link>
          ) : (
            <span className="btn border border-velvet-800 px-4 py-2 text-dust-400 opacity-50">Suivant</span>
          )}
        </nav>
      )}
    </section>
  );
}
