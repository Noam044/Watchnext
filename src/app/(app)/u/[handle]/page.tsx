import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnimatedNumber } from "@/components/animated-number";
import { Avatar } from "@/components/avatar";
import { CutReveal } from "@/components/cut-reveal";
import { Filmstrip } from "@/components/filmstrip";
import { FriendButton } from "@/components/friend-button";
import { FullImportReminder } from "@/components/full-import-reminder";
import { ChatIcon, ExternalIcon, LockIcon, PencilIcon } from "@/components/icons";
import { Library } from "@/components/library";
import { ScopeScreen } from "@/components/scope-screen";
import { prisma } from "@/lib/db";
import { canViewLibrary, favoritesNotSeenBy, getRelation, tasteMatch } from "@/lib/friends";
import {
  getLibraryCounts,
  getLibraryPage,
  needsFullImport,
  parseLibraryQuery,
  publicUserSelect,
  resolveEmblem,
} from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { getProfileSummary } from "@/lib/stats";
import { displayName } from "@/lib/users";

const getUser = (handle: string) =>
  prisma.user.findUnique({ where: { handle: decodeURIComponent(handle).toLowerCase() }, select: publicUserSelect });

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const user = await getUser((await params).handle);
  return { title: user ? `${displayName(user)} (@${user.handle})` : "Profil introuvable" };
}

const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

export default async function ProfilePage({ params, searchParams }: PageProps<"/u/[handle]">) {
  const me = await requireUser();
  const owner = await getUser((await params).handle);
  if (!owner) notFound();

  const name = displayName(owner);
  const isSelf = owner.id === me.id;
  const relation = await getRelation(me.id, owner.id);
  const visible = canViewLibrary(relation, owner.publicProfile);
  const query = parseLibraryQuery(await searchParams);

  const [emblem, summary, counts, page, match, favorites, rssOnly] = await Promise.all([
    resolveEmblem(owner),
    visible ? getProfileSummary(owner.id) : null,
    visible ? getLibraryCounts(owner.id) : null,
    visible ? getLibraryPage(owner.id, query) : null,
    !isSelf && visible ? tasteMatch(me.id, owner.id) : null,
    !isSelf && visible ? favoritesNotSeenBy(owner.id, me.id) : null,
    isSelf ? needsFullImport(owner.id) : false,
  ]);

  return (
    <div className="space-y-12">
      {/* En-tête : l'écran du film fétiche, puis l'identité */}
      <header>
        <ScopeScreen
          backdropPath={emblem?.backdropPath}
          posterPath={emblem?.posterPath}
          alt=""
          preload
          animate
          className="-mx-4 rounded-none sm:mx-0 sm:rounded-md"
        >
          <div className="absolute inset-0 bg-linear-to-t from-velvet-950/80 via-transparent to-transparent" />
          {emblem && (
            <p className="meta absolute right-4 bottom-3 hidden text-screen/75 sm:block">
              Film fétiche · {emblem.title}
              {emblem.year ? ` (${emblem.year})` : ""}
            </p>
          )}
        </ScopeScreen>

        <div className="relative flex flex-col gap-5 px-1 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar name={name} handle={owner.handle} size="xl" className="-mt-12 ring-4 sm:-mt-14" />
            <div className="min-w-0 pb-1">
              <h1 className="marquee text-5xl break-words sm:text-6xl">
                <CutReveal text={name} delay={350} />
              </h1>
              <p className="meta mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
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
                <span>Membre depuis {monthFmt.format(owner.createdAt)}</span>
              </p>
            </div>
          </div>
          <div className="shrink-0 pb-1">
            {isSelf ? (
              <Link href="/profile/edit" className="btn-ghost">
                <PencilIcon /> Modifier le profil
              </Link>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {relation === "friends" && (
                  <Link href={`/messages/${owner.handle}`} className="btn-primary">
                    <ChatIcon /> Écrire
                  </Link>
                )}
                <FriendButton userId={owner.id} name={name} relation={relation} />
              </div>
            )}
          </div>
        </div>

        {owner.bio && <p className="mt-5 max-w-2xl px-1 text-base leading-relaxed text-screen/90 sm:px-6">{owner.bio}</p>}

        {summary && (
          <dl className="mt-8 grid grid-cols-3 divide-velvet-800 border-y border-velvet-800 sm:grid-cols-5 sm:divide-x">
            <Stat label="Films vus" value={summary.watchedCount} />
            <Stat label="Notés" value={summary.ratedCount} />
            <Stat label="Moyenne" value={summary.averageRating} decimals suffix="★" />
            <Stat label="Coups de cœur" value={summary.likedCount} />
            <Stat label="Watchlist" value={summary.watchlistCount} />
          </dl>
        )}
      </header>

      {rssOnly && summary && <FullImportReminder kind="rss-only" filmCount={counts?.watched ?? summary.watchedCount} />}

      {!visible && (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <LockIcon className="size-7 text-dust-400" />
          <p className="marquee text-3xl">Bibliothèque réservée aux amis</p>
          <p className="max-w-md text-sm text-dust-300">
            {relation === "outgoing"
              ? `Ta demande est envoyée. Tu verras les films de ${name} dès qu'elle sera acceptée.`
              : relation === "incoming"
                ? `${name} veut t'ajouter en ami. Accepte pour voir vos films en commun.`
                : `Ajoute ${name} en ami pour voir ses notes et vos films en commun.`}
          </p>
        </div>
      )}

      {match && (
        <section aria-labelledby="affinite" className="grid gap-6 lg:grid-cols-[18rem_1fr] lg:items-start">
          <div className="card p-6">
            <p className="eyebrow" id="affinite">
              Affinité avec toi
            </p>
            <p className="marquee mt-2 text-7xl text-tungsten tabular-nums">
              {match.pct != null ? <AnimatedNumber value={match.pct} suffix=" %" delay={300} /> : "—"}
            </p>
            <p className="mt-3 text-sm text-dust-300">
              {match.pct != null
                ? `Calculée sur ${match.ratedTogether} films que vous avez notés tous les deux.`
                : "Pas assez de films notés en commun pour la calculer (5 minimum)."}
            </p>
            <p className="meta mt-4 border-t border-velvet-800 pt-4">
              {match.common} films vus en commun · {match.bothLiked} coups de cœur partagés
            </p>
          </div>
          {favorites && favorites.length > 0 && (
            <div className="min-w-0">
              <h2 className="marquee mb-4 text-3xl">Ses coups de cœur que tu n&apos;as pas vus</h2>
              <Filmstrip
                label={`Coups de cœur de ${name} que tu n'as pas vus`}
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
        <section aria-labelledby="gouts" className="space-y-4">
          <h2 id="gouts" className="marquee text-4xl">
            {isSelf ? "Tes goûts" : "Ses goûts"}
          </h2>
          <div className="card grid divide-y divide-velvet-800 md:grid-cols-[1.2fr_1fr_1fr] md:divide-x md:divide-y-0">
            <RankList title="Genres" items={summary.topGenres.map((g) => ({ name: g.name, score: g.score }))} />
            <RankList
              title="Réalisateurs"
              items={summary.topDirectors.map((d) => ({ name: d.name, score: d.score, sub: `${d.count} films` }))}
              empty="Pas encore assez de films notés."
            />
            <RankList
              title="Acteurs"
              items={summary.topActors.map((d) => ({ name: d.name, score: d.score, sub: `${d.count} films` }))}
              empty="Pas encore assez de films notés."
            />
          </div>
          {summary.topDecades[0] && (
            <p className="meta">
              Décennie favorite : <span className="text-screen">{summary.topDecades[0].name}</span>
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

function Stat({
  label,
  value,
  decimals = false,
  suffix,
}: {
  label: string;
  value: number | null;
  decimals?: boolean;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col-reverse px-2 py-4 text-center sm:px-4">
      <dt className="eyebrow mt-1 text-[10px] tracking-[0.14em]">{label}</dt>
      <dd className="marquee text-3xl tabular-nums sm:text-4xl">
        {value == null ? (
          "—"
        ) : (
          <AnimatedNumber
            value={decimals ? Math.round(value * 10) / 10 : value}
            format={decimals ? { minimumFractionDigits: 1, maximumFractionDigits: 1 } : undefined}
            suffix={suffix}
            delay={450}
          />
        )}
      </dd>
    </div>
  );
}

function RankList({
  title,
  items,
  empty = "—",
}: {
  title: string;
  items: { name: string; score: number; sub?: string }[];
  empty?: string;
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
                <div className="h-full rounded-full bg-tungsten/75" style={{ width: `${Math.round(it.score * 100)}%` }} />
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
