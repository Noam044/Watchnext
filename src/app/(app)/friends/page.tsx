import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { CopyHandle } from "@/components/copy-handle";
import { FriendButton } from "@/components/friend-button";
import { ArrowRightIcon, SearchIcon, UsersIcon } from "@/components/icons";
import { ScopeScreen } from "@/components/scope-screen";
import { Ticket, TicketFilm } from "@/components/ticket";
import { formatNumber } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { getFriendsActivity } from "@/lib/activity";
import { avatarUrl } from "@/lib/avatar";
import { prisma } from "@/lib/db";
import { localizeFilms } from "@/lib/film-locale";
import { relationFrom, tasteMatches } from "@/lib/friends";
import { resolveEmblems } from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { displayName } from "@/lib/users";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.friends.meta };
}

const userCard = { id: true, name: true, handle: true, bio: true, emblemFilm: true, avatarAt: true } as const;

export default async function FriendsPage({ searchParams }: PageProps<"/friends">) {
  const me = await requireUser();
  const { t, locale } = await getI18n();
  const f = t.friends;
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().replace(/^@/, "").slice(0, 60) ?? "";

  const links = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: me.id }, { addresseeId: me.id }] },
    include: { requester: { select: userCard }, addressee: { select: userCard } },
    orderBy: { createdAt: "desc" },
  });
  const other = (f: (typeof links)[number]) => (f.requesterId === me.id ? f.addressee : f.requester);
  const friends = links.filter((f) => f.status === "ACCEPTED").map(other);
  const incoming = links.filter((f) => f.status === "PENDING" && f.addresseeId === me.id).map((f) => f.requester);
  const outgoing = links.filter((f) => f.status === "PENDING" && f.requesterId === me.id).map((f) => f.addressee);

  const friendIdsList = friends.map((u) => u.id);
  const [results, matches, emblems, watchedCounts, activity] = await Promise.all([
    q.length >= 2
      ? prisma.user.findMany({
          where: {
            id: { not: me.id },
            OR: [{ handle: { contains: q.toLowerCase() } }, { name: { contains: q, mode: "insensitive" } }],
          },
          select: userCard,
          orderBy: { handle: "asc" },
          take: 20,
        })
      : null,
    // Affinités, bannières et nombres de films : une requête chacun, quel que soit le nombre d'amis.
    tasteMatches(me.id, friendIdsList),
    resolveEmblems(friends),
    friends.length
      ? prisma.userFilm.groupBy({
          by: ["userId"],
          where: { userId: { in: friendIdsList }, watched: true },
          _count: true,
        })
      : [],
    friends.length ? getFriendsActivity(me.id, 12) : [],
  ]);
  localizeFilms(activity, locale);
  const watchedBy = new Map(watchedCounts.map((w) => [w.userId, w._count]));
  const friendCards = friends.map((u) => ({
    user: u,
    emblem: emblems.get(u.id) ?? null,
    match: matches.get(u.id) ?? { common: 0, bothLiked: 0, ratedTogether: 0, pct: null },
    watched: watchedBy.get(u.id) ?? 0,
  }));
  friendCards.sort((a, b) => (b.match.pct ?? -1) - (a.match.pct ?? -1));

  const relationOf = (userId: string) =>
    relationFrom(me.id, userId, links.find((f) => f.requesterId === userId || f.addresseeId === userId) ?? null);

  return (
    <div className="space-y-12">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="marquee text-6xl sm:text-7xl">{f.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-dust-300">
            <span className="text-screen">
              {f.count(friends.length)}
              {incoming.length > 0 && f.pending(incoming.length)}.
            </span>
            {f.shareHandle} <CopyHandle handle={me.handle} />
          </p>
        </div>
        <form role="search" className="relative w-full lg:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-dust-400" />
          <input
            name="q"
            type="search"
            defaultValue={q}
            minLength={2}
            placeholder={f.searchPlaceholder}
            aria-label={f.searchLabel}
            className="input py-3.5 pl-11 text-base"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </form>
      </header>

      {results && (
        <section aria-labelledby="resultats" className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 id="resultats" className="marquee text-3xl">
              {f.resultsFor(q)}
            </h2>
            <Link href="/friends" className="meta hover:text-screen">
              {f.clear}
            </Link>
          </div>
          {results.length ? (
            <ul className="divide-y divide-velvet-800 rounded-lg border border-velvet-800 bg-velvet-900/60">
              {results.map((u) => (
                <PersonRow key={u.id} user={u}>
                  <FriendButton userId={u.id} name={displayName(u)} relation={relationOf(u.id)} compact />
                </PersonRow>
              ))}
            </ul>
          ) : (
            <p className="card px-6 py-8 text-center text-sm text-dust-300">{f.noResults}</p>
          )}
        </section>
      )}

      {incoming.length > 0 && (
        <section aria-labelledby="demandes" className="space-y-4">
          <h2 id="demandes" className="marquee text-3xl">
            {f.incoming}
          </h2>
          <ul className="divide-y divide-velvet-800 rounded-lg border border-tungsten/25 bg-velvet-900/60">
            {incoming.map((u) => (
              <PersonRow key={u.id} user={u}>
                <FriendButton userId={u.id} name={displayName(u)} relation="incoming" compact />
              </PersonRow>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="mes-amis" className="space-y-5">
        <h2 id="mes-amis" className="marquee text-3xl">
          {f.myFriends}
        </h2>
        {friendCards.length ? (
          <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {friendCards.map(({ user, emblem, match, watched }) => (
              <li key={user.id} className="reveal">
                <Link href={`/u/${user.handle}`} className="group block">
                  <ScopeScreen
                    backdropPath={emblem?.backdropPath}
                    posterPath={emblem?.posterPath}
                    alt=""
                    size="w780"
                    sizes="(max-width: 640px) 100vw, 360px"
                    glow={false}
                    className="ring-1 ring-white/5 transition duration-300 group-hover:ring-screen/25"
                    imageClassName="transition duration-500 group-hover:brightness-110"
                  />
                  <div className="relative flex items-end gap-3 px-3">
                    <Avatar
                      name={displayName(user)}
                      handle={user.handle}
                      src={avatarUrl(user)}
                      size="lg"
                      className="-mt-7 ring-4"
                    />
                    <div className="min-w-0 flex-1 pb-0.5">
                      <p className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-semibold group-hover:text-tungsten">{displayName(user)}</span>
                        {match.pct != null && (
                          <span className="meta shrink-0 text-tungsten">
                            {match.pct} % {f.affinity}
                          </span>
                        )}
                      </p>
                      <p className="meta truncate text-[11px]">
                        {f.cardMeta(user.handle, formatNumber(watched, locale), match.common)}
                      </p>
                    </div>
                  </div>
                </Link>
                <Link
                  href={`/duo/${user.handle}`}
                  className="mt-2 ml-[4.75rem] inline-flex items-center gap-1.5 text-xs text-dust-300 hover:text-tungsten"
                >
                  <UsersIcon className="size-3.5" /> {t.duo.open} <ArrowRightIcon className="size-3" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
            <p className="marquee text-3xl">{f.emptyTitle}</p>
            <p className="max-w-md text-sm text-dust-300">{f.emptyText}</p>
          </div>
        )}
      </section>

      {friendCards.length > 0 && (
        <section aria-labelledby="seances" className="space-y-5">
          <div>
            <h2 id="seances" className="marquee text-3xl sm:text-4xl">
              {f.activityTitle}
            </h2>
            <p className="mt-1.5 text-sm text-dust-300">{f.activityText}</p>
          </div>
          {activity.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {activity.map((a) => (
                <li key={a.id} className="reveal">
                  <Ticket date={a.watchedAt} locale={locale} undated={t.common.undated}>
                    <TicketFilm
                      tmdbId={a.film.tmdbId}
                      title={a.film.title}
                      year={a.film.year}
                      posterPath={a.film.posterPath}
                      rating={a.rating}
                      liked={a.liked}
                      likedLabel={t.common.liked}
                      kicker={
                        <Link href={`/u/${a.user.handle}`} className="font-semibold text-dust-300 hover:text-tungsten">
                          {displayName(a.user)}
                        </Link>
                      }
                    >
                      {a.review && (
                        <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-dust-300">
                          {a.reviewSpoilers ? (
                            <span className="italic">{f.spoilerReview}</span>
                          ) : (
                            t.common.quote(a.review)
                          )}
                        </p>
                      )}
                    </TicketFilm>
                  </Ticket>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-dust-400">{f.activityEmpty}</p>
          )}
        </section>
      )}

      {outgoing.length > 0 && (
        <section aria-labelledby="envoyees" className="space-y-4">
          <h2 id="envoyees" className="text-sm font-semibold text-dust-300">
            {f.outgoing}
          </h2>
          <ul className="divide-y divide-velvet-800 rounded-lg border border-velvet-800">
            {outgoing.map((u) => (
              <PersonRow key={u.id} user={u}>
                <FriendButton userId={u.id} name={displayName(u)} relation="outgoing" compact />
              </PersonRow>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PersonRow({
  user,
  children,
}: {
  user: { id: string; name: string | null; handle: string; bio: string | null; avatarAt: Date | null };
  children: React.ReactNode;
}) {
  const name = displayName(user);
  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:gap-4">
      <Link href={`/u/${user.handle}`} className="flex min-w-0 flex-1 items-center gap-3 hover:text-tungsten">
        <Avatar name={name} handle={user.handle} src={avatarUrl(user)} />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{name}</span>
          <span className="meta block truncate text-[11px]">
            @{user.handle}
            {user.bio ? ` · ${user.bio}` : ""}
          </span>
        </span>
      </Link>
      <div className="shrink-0">{children}</div>
    </li>
  );
}
