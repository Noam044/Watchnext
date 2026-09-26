import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Avatar } from "@/components/avatar";
import { BackButton } from "@/components/back-button";
import { DuoProgramme, type DuoItem } from "@/components/duo-programme";
import { LockIcon } from "@/components/icons";
import { getI18n } from "@/i18n/server";
import { avatarUrl } from "@/lib/avatar";
import { prisma } from "@/lib/db";
import { getDuoPicks } from "@/lib/duo";
import { localizeFilms } from "@/lib/film-locale";
import { refs } from "@/lib/films";
import { getRelation, tasteMatch } from "@/lib/friends";
import { getLocalizer } from "@/lib/localize";
import { offersFor } from "@/lib/providers";
import { getCurrentUser, requireUser } from "@/lib/session";
import { getStreamingPrefs, providerCatalog, withFreshOffers } from "@/lib/streaming";
import { displayName } from "@/lib/users";

export const maxDuration = 30;

const getUser = (handle: string) =>
  prisma.user.findUnique({
    where: { handle: decodeURIComponent(handle).toLowerCase() },
    select: { id: true, name: true, handle: true, avatarAt: true },
  });

export async function generateMetadata({ params }: PageProps<"/duo/[handle]">): Promise<Metadata> {
  // Le nom d'un membre n'apparaît pas dans le titre pour un visiteur sans compte.
  const user = (await getCurrentUser()) ? await getUser((await params).handle) : null;
  const d = (await getI18n()).t.duo;
  return { title: user ? d.meta(displayName(user)) : d.title };
}

export default async function DuoPage({ params }: PageProps<"/duo/[handle]">) {
  const me = await requireUser();
  const friend = await getUser((await params).handle);
  if (!friend || friend.id === me.id) notFound();
  const name = displayName(friend);
  const { t, locale } = await getI18n();
  const d = t.duo;

  if ((await getRelation(me.id, friend.id)) !== "friends") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <BackButton />
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <LockIcon className="size-7 text-dust-400" />
          <p className="marquee text-3xl">{d.friendsOnlyTitle}</p>
          <p className="max-w-md text-sm text-dust-300">{d.friendsOnlyText(name)}</p>
          <Link href={`/u/${friend.handle}`} className="btn-primary mt-2">
            {t.messages.seeProfile}
          </Link>
        </div>
      </div>
    );
  }

  const [picks, match, myPrefs, friendPrefs, loc] = await Promise.all([
    getDuoPicks(me.id, friend.id),
    tasteMatch(me.id, friend.id),
    getStreamingPrefs(me.id),
    getStreamingPrefs(friend.id),
    getLocalizer(locale),
  ]);
  // Les offres affichées sont celles du pays de l'utilisateur ; les abonnements des deux sont réunis.
  const { refreshed, refreshLater } = await withFreshOffers(picks.map((p) => p.film));
  after(refreshLater);
  // Titres (films proposés et films aimés cités) dans la langue de l'interface.
  localizeFilms([picks, refreshed], locale);
  const ours = [...new Set([...myPrefs.providers, ...friendPrefs.providers])];

  const items: DuoItem[] = picks.map((p) => {
    const film = refreshed.get(p.film.tmdbId) ?? p.film;
    return {
      tmdbId: film.tmdbId,
      title: film.title,
      year: film.year,
      posterPath: film.posterPath,
      backdropPath: film.backdropPath,
      runtime: film.runtime,
      directors: refs(film.directors).map((x) => x.name),
      genres: refs(film.genres).map(loc.genre),
      pct: p.pct,
      mePct: p.mePct,
      friendPct: p.friendPct,
      meBecause: p.meBecause?.title ?? null,
      friendBecause: p.friendBecause?.title ?? null,
      inMyWatchlist: p.inMyWatchlist,
      inFriendWatchlist: p.inFriendWatchlist,
      offers: offersFor(film.providers, myPrefs.region),
    };
  });
  const catalog = await providerCatalog(myPrefs.region, [...items.flatMap((i) => i.offers?.stream ?? []), ...ours]);

  return (
    <div className="space-y-10">
      {/* Sur téléphone : les deux avatars au-dessus du titre, le tout centré. */}
      <header className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
          <span className="flex shrink-0 -space-x-5">
            <Avatar name={displayName(me)} handle={me.handle} src={avatarUrl(me)} size="lg" className="ring-4" />
            <Avatar name={name} handle={friend.handle} src={avatarUrl(friend)} size="lg" className="ring-4" />
          </span>
          <div className="min-w-0">
            <h1 className="marquee text-5xl sm:text-6xl">{d.title}</h1>
            <p className="mt-2 text-sm text-dust-300">{d.intro(name)}</p>
          </div>
        </div>
        {match.pct != null && <p className="meta shrink-0 text-tungsten">{d.affinity(match.pct)}</p>}
      </header>

      {/* Dans les phrases (« Hugo a aimé… »), le prénom suffit. */}
      <DuoProgramme
        items={items}
        friend={{ id: friend.id, name: name.split(/\s+/)[0] }}
        catalog={catalog}
        ours={ours}
      />
    </div>
  );
}
