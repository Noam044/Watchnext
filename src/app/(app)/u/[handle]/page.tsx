import type { Format } from "@number-flow/react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { Avatar } from "@/components/avatar";
import { CutReveal } from "@/components/cut-reveal";
import { Filmstrip } from "@/components/filmstrip";
import { FriendButton } from "@/components/friend-button";
import { FullImportReminder } from "@/components/full-import-reminder";
import { InView } from "@/components/in-view";
import { ArrowRightIcon, ChatIcon, ExternalIcon, LockIcon, PencilIcon, UsersIcon } from "@/components/icons";
import { Library } from "@/components/library";
import { ScopeScreen } from "@/components/scope-screen";
import { dateFormat } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { avatarUrl } from "@/lib/avatar";
import { prisma } from "@/lib/db";
import { localizeFilms } from "@/lib/film-locale";
import { getLocalizer } from "@/lib/localize";
import { canViewLibrary, favoritesNotSeenBy, getRelation, tasteMatch } from "@/lib/friends";
import {
  getLibraryCounts,
  getLibraryPage,
  needsFullImport,
  parseLibraryQuery,
  publicUserSelect,
  resolveEmblem,
} from "@/lib/profile";
import { getCurrentUser, requireUser } from "@/lib/session";
import { getProfileSummary } from "@/lib/stats";
import { displayName } from "@/lib/users";

const getUser = (handle: string) =>
  prisma.user.findUnique({ where: { handle: decodeURIComponent(handle).toLowerCase() }, select: publicUserSelect });

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  // Le nom d'un membre n'apparaît pas dans le titre pour un visiteur sans compte.
  if (!(await getCurrentUser())) return { title: "Watchnext" };
  const user = await getUser((await params).handle);
  return { title: user ? `${displayName(user)} (@${user.handle})` : (await getI18n()).t.profile.notFound };
}


export default async function ProfilePage({ params, searchParams }: PageProps<"/u/[handle]">) {
  const me = await requireUser();
  const owner = await getUser((await params).handle);
  if (!owner) notFound();

  const name = displayName(owner);
  const isSelf = owner.id === me.id;
  const relation = await getRelation(me.id, owner.id);
  const visible = canViewLibrary(relation, owner.publicProfile);
  const query = parseLibraryQuery(await searchParams);

  const [emblem, summary, counts, page, match, favorites, rssOnly, { t, locale }] = await Promise.all([
    resolveEmblem(owner),
    visible ? getProfileSummary(owner.id) : null,
    visible ? getLibraryCounts(owner.id) : null,
    visible ? getLibraryPage(owner.id, query) : null,
    !isSelf && visible ? tasteMatch(me.id, owner.id) : null,
    !isSelf && visible ? favoritesNotSeenBy(owner.id, me.id) : null,
    isSelf ? needsFullImport(owner.id) : false,
    getI18n(),
  ]);
  // Titres des films (bannière, pellicule, bibliothèque) dans la langue de l'interface.
  localizeFilms([emblem, page, favorites], locale);
  const p = t.profile;
  const loc = await getLocalizer(locale);
  const monthFmt = dateFormat(locale, { month: "long", year: "numeric" });

  return (
    <div className="space-y-12">
      {/* En-tête : l'écran du film fétiche, puis l'identité */}
      <header>
        {emblem ? (
          // La bannière ouvre la fiche du film fétiche ; son image s'y transforme en écran de la fiche.
          <Link
            href={`/film/${emblem.tmdbId}`}
            aria-label={p.emblemLink(emblem.title)}
            className="group/screen -mx-4 block sm:mx-0"
          >
            <ViewTransition name={`screen-${emblem.tmdbId}`} share="morph" default="none">
              <ScopeScreen
                backdropPath={emblem.backdropPath}
                posterPath={emblem.posterPath}
                alt=""
                preload
                animate
                className="rounded-none transition-shadow duration-500 group-hover/screen:shadow-[0_0_0_1px_rgb(246_236_220/0.14),0_40px_120px_-30px_rgb(242_184_75/0.3)] sm:rounded-md"
                imageClassName="[transition:scale_6s_cubic-bezier(0.2,0.7,0.2,1),filter_0.7s_ease-out] group-hover/screen:scale-105 group-hover/screen:brightness-110"
              >
                <div className="absolute inset-0 bg-linear-to-t from-velvet-950/80 via-transparent to-transparent" />
                <p className="meta absolute right-4 bottom-3 hidden items-center gap-1.5 text-screen/75 transition group-hover/screen:text-screen sm:flex">
                  {p.emblem} · {emblem.title}
                  {emblem.year ? ` (${emblem.year})` : ""}
                  <ArrowRightIcon className="size-3.5 transition-transform duration-300 group-hover/screen:translate-x-0.5" />
                </p>
              </ScopeScreen>
            </ViewTransition>
          </Link>
        ) : (
          <ScopeScreen backdropPath={null} alt="" className="-mx-4 rounded-none sm:mx-0 sm:rounded-md" />
        )}

        {/* Sur téléphone, l'identité est centrée sous la bannière ; sur écran moyen, les boutons passent
            sous le nom quand la ligne est trop courte pour les deux. */}
        <div className="relative flex flex-col items-center gap-5 px-1 text-center sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:px-6 sm:text-left">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
            <Avatar
              name={name}
              handle={owner.handle}
              src={avatarUrl(owner)}
              size="xl"
              className="-mt-12 animate-pop ring-4 [animation-delay:200ms] sm:-mt-14"
            />
            <div className="min-w-0 pb-1">
              <h1 className="marquee text-5xl break-words sm:text-6xl">
                <CutReveal text={name} delay={350} />
              </h1>
              <p className="meta mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-start">
                <span>@{owner.handle}</span>
                {owner.letterboxd?.username && (
                  <a
                    href={`https://letterboxd.com/${owner.letterboxd.username}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-tungsten"
                  >
                    Letterboxd <ExternalIcon className="size-3" />
                  </a>
                )}
                <span>{p.memberSince(monthFmt.format(owner.createdAt))}</span>
              </p>
            </div>
          </div>
          <div className="shrink-0 pb-1 max-sm:w-full">
            {isSelf ? (
              <Link href="/profile/edit" className="btn-ghost">
                <PencilIcon /> {p.editProfile}
              </Link>
            ) : (
              // Téléphone : « Séance à deux » et « Écrire » se partagent la première ligne à parts égales.
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {relation === "friends" && (
                  <>
                    <Link href={`/duo/${owner.handle}`} className="btn-primary max-sm:grow max-sm:basis-[calc(50%-0.25rem)]">
                      <UsersIcon /> {t.duo.open}
                    </Link>
                    <Link href={`/messages/${owner.handle}`} className="btn-ghost max-sm:grow max-sm:basis-[calc(50%-0.25rem)]">
                      <ChatIcon /> {p.write}
                    </Link>
                  </>
                )}
                <FriendButton userId={owner.id} name={name} relation={relation} />
              </div>
            )}
          </div>
        </div>

        {owner.bio && (
          <p className="mx-auto mt-5 max-w-2xl px-1 text-center text-base leading-relaxed text-screen/90 sm:mx-0 sm:px-6 sm:text-left">
            {owner.bio}
          </p>
        )}

        {summary && (
          <dl className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 border-y border-velvet-800 px-1 py-4 sm:justify-start sm:gap-x-7 sm:px-6">
            {/* Chaque chiffre défile jusqu'à sa valeur, l'un après l'autre. */}
            <Stat value={summary.watchedCount} delay={400} label={p.statWatched(summary.watchedCount)} />
            <Stat value={summary.ratedCount} delay={520} label={p.statRated(summary.ratedCount)} />
            {summary.averageRating != null && (
              <Stat
                value={summary.averageRating}
                delay={640}
                format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                suffix="★"
                label={p.statAverage}
              />
            )}
            <Stat value={summary.likedCount} delay={760} label={p.statLiked(summary.likedCount)} />
            <Stat value={summary.watchlistCount} delay={880} label={p.statWatchlist} />
          </dl>
        )}
      </header>

      {rssOnly && summary && <FullImportReminder kind="rss-only" filmCount={counts?.watched ?? summary.watchedCount} />}

      {!visible && (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <LockIcon className="size-7 text-dust-400" />
          <p className="marquee text-3xl">{p.lockedTitle}</p>
          <p className="max-w-md text-sm text-dust-300">
            {relation === "outgoing"
              ? p.lockedOutgoing(name)
              : relation === "incoming"
                ? p.lockedIncoming(name)
                : p.lockedNone(name)}
          </p>
        </div>
      )}

      {match && (
        <section aria-labelledby="affinite" className="reveal grid gap-6 lg:grid-cols-[18rem_1fr] lg:items-start">
          {/* Sur téléphone, les titres de section et le score d'affinité sont centrés. */}
          <div className="max-sm:text-center">
            <h2 id="affinite" className="marquee text-3xl">
              {p.affinity}
            </h2>
            <p className="mt-4 font-display text-7xl leading-none font-extrabold text-tungsten tabular-nums">
              {match.pct != null ? <AnimatedNumber value={match.pct} suffix=" %" delay={300} /> : "—"}
            </p>
            {match.pct != null && (
              // La jauge se remplit quand on arrive sur la section, puis un reflet la parcourt.
              <InView className="group/aff mt-4 h-1 overflow-hidden rounded-full bg-velvet-800" aria-hidden>
                <div
                  className="grow-x relative h-full overflow-hidden rounded-full bg-tungsten shadow-[0_0_12px_var(--color-tungsten)]"
                  style={{ width: `${match.pct}%`, transitionDuration: "1.6s", transitionDelay: "300ms" }}
                >
                  <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/70 to-transparent group-data-shown/aff:animate-shine group-data-shown/aff:[animation-delay:1.7s]" />
                </div>
              </InView>
            )}
            <p className="mt-4 text-sm text-dust-300">
              {match.pct != null ? p.affinityBasis(match.ratedTogether) : p.affinityTooFew}
            </p>
            <p className="mt-2 text-sm text-dust-400">{p.affinityCommon(match.common, match.bothLiked)}</p>
          </div>
          {favorites && favorites.length > 0 && (
            <div className="min-w-0">
              <h2 className="marquee mb-4 text-3xl max-sm:text-center">{p.theirFavorites}</h2>
              <Filmstrip
                label={p.theirFavoritesLabel(name)}
                frames={favorites.map((f) => ({
                  id: f.id,
                  tmdbId: f.film.tmdbId,
                  title: f.film.title,
                  year: f.film.year,
                  backdropPath: f.film.backdropPath,
                  posterPath: f.film.posterPath,
                  rating: f.rating,
                  liked: f.liked,
                }))}
              />
            </div>
          )}
        </section>
      )}

      {summary && summary.watchedCount > 0 && (
        <section aria-labelledby="gouts" className="reveal space-y-4">
          <h2 id="gouts" className="marquee text-4xl max-sm:text-center">
            {isSelf ? p.tasteSelf : p.tasteOther}
          </h2>
          {/* Les barres se remplissent colonne après colonne quand la carte entre à l'écran. */}
          <InView className="card grid divide-y divide-velvet-800 md:grid-cols-[1.2fr_1fr_1fr] md:divide-x md:divide-y-0">
            <RankList title={p.genres} items={summary.topGenres.map((g) => ({ name: loc.genre(g), score: g.score }))} />
            <RankList
              title={p.directors}
              items={summary.topDirectors.map((d) => ({ name: d.name, score: d.score, sub: p.filmsCount(d.count) }))}
              empty={p.notEnoughRated}
              delay={250}
            />
            <RankList
              title={p.actors}
              items={summary.topActors.map((d) => ({ name: d.name, score: d.score, sub: p.filmsCount(d.count) }))}
              empty={p.notEnoughRated}
              delay={500}
            />
          </InView>
          {summary.topDecades[0] && (
            <p className="meta max-sm:text-center">
              {p.favoriteDecade} <span className="text-screen">{loc.decade(summary.topDecades[0].id)}</span>
            </p>
          )}
        </section>
      )}

      {summary && counts && page && (
        <Library
          basePath={`/u/${owner.handle}`}
          query={query}
          counts={counts}
          distribution={summary.distribution}
          page={page}
          isSelf={isSelf}
        />
      )}
    </div>
  );
}

/** Un chiffre suivi de ce qu'il compte, lu comme une phrase : « 185 films vus ». */
function Stat({
  label,
  value,
  delay,
  format,
  suffix,
}: {
  label: string;
  value: number;
  /** Délai avant le défilement du chiffre, en ms. */
  delay: number;
  format?: Format;
  suffix?: string;
}) {
  return (
    <div className="flex flex-row-reverse items-baseline justify-end gap-1.5">
      <dt className="text-sm text-dust-300">{label}</dt>
      <dd className="font-display text-2xl font-extrabold tabular-nums">
        <AnimatedNumber value={value} delay={delay} format={format} suffix={suffix} />
      </dd>
    </div>
  );
}

function RankList({
  title,
  items,
  empty = "—",
  delay = 0,
}: {
  title: string;
  items: { name: string; score: number; sub?: string }[];
  empty?: string;
  /** Décalage de la colonne dans la cascade de remplissage, en ms. */
  delay?: number;
}) {
  return (
    <div className="p-5 sm:p-6">
      <h3 className="eyebrow">{title}</h3>
      {items.length ? (
        <ol className="mt-4 space-y-3">
          {items.map((it, i) => (
            <li key={it.name} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">
                  <span className="mr-2 font-mono text-xs text-dust-400">{i + 1}</span>
                  {it.name}
                </span>
                {it.sub && <span className="meta shrink-0 text-[11px]">{it.sub}</span>}
              </div>
              <div className="h-[3px] rounded-full bg-velvet-800">
                <div
                  className="grow-x h-full rounded-full bg-tungsten/75"
                  style={{ width: `${Math.round(it.score * 100)}%`, transitionDelay: `${delay + i * 90}ms` }}
                />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-dust-400">{empty}</p>
      )}
    </div>
  );
}
