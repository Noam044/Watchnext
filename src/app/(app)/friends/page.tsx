import type { Metadata } from "next";
import Link from "next/link";
import { AnimatedNumber } from "@/components/animated-number";
import { Avatar } from "@/components/avatar";
import { CopyHandle } from "@/components/copy-handle";
import { FriendButton } from "@/components/friend-button";
import { SearchIcon } from "@/components/icons";
import { ScopeScreen } from "@/components/scope-screen";
import { formatNumber } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { relationFrom, tasteMatch } from "@/lib/friends";
import { resolveEmblem } from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { displayName } from "@/lib/users";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.friends.meta };
}

const userCard = { id: true, name: true, handle: true, bio: true, emblemFilm: true } as const;

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

  const [results, friendCards] = await Promise.all([
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
    Promise.all(
      friends.map(async (u) => {
        const [emblem, match, watched] = await Promise.all([
          resolveEmblem(u),
          tasteMatch(me.id, u.id),
          prisma.userFilm.count({ where: { userId: u.id, watched: true } }),
        ]);
        return { user: u, emblem, match, watched };
      }),
    ),
  ]);
  friendCards.sort((a, b) => (b.match.pct ?? -1) - (a.match.pct ?? -1));

  const relationOf = (userId: string) =>
    relationFrom(
      me.id,
      userId,
      links.find((f) => f.requesterId === userId || f.addresseeId === userId) ?? null,
    );

  return (
    <div className="space-y-12">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">
            {f.count(friends.length)}
            {incoming.length > 0 && f.pending(incoming.length)}
          </p>
          <h1 className="marquee mt-1 text-6xl sm:text-7xl">{f.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-dust-300">
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
            className="input rounded-full py-3.5 pl-11 text-base"
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
            <ul className="divide-y divide-velvet-800 rounded-2xl border border-velvet-800 bg-velvet-900/60">
              {results.map((u) => (
                <PersonRow key={u.id} user={u}>
                  <FriendButton userId={u.id} name={displayName(u)} relation={relationOf(u.id)} compact />
                </PersonRow>
              ))}
            </ul>
          ) : (
            <p className="card px-6 py-8 text-center text-sm text-dust-300">
              {f.noResults}
            </p>
          )}
        </section>
      )}

      {incoming.length > 0 && (
        <section aria-labelledby="demandes" className="space-y-4">
          <h2 id="demandes" className="marquee text-3xl">
            {f.incoming}
          </h2>
          <ul className="divide-y divide-velvet-800 rounded-2xl border border-tungsten/25 bg-velvet-900/60">
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
                    className="ring-1 ring-white/5 transition duration-300 group-hover:screen-glow"
                  >
                    {match.pct != null && (
                      <span className="absolute top-2 right-2 rounded-full bg-velvet-950/85 px-2 py-0.5 font-mono text-[11px] font-bold text-tungsten backdrop-blur">
                        <AnimatedNumber value={match.pct} suffix=" %" delay={300} /> {f.affinity}
                      </span>
                    )}
                  </ScopeScreen>
                  <div className="relative flex items-end gap-3 px-3">
                    <Avatar name={displayName(user)} handle={user.handle} size="lg" className="-mt-7 ring-4" />
                    <div className="min-w-0 pb-0.5">
                      <p className="truncate font-semibold group-hover:text-tungsten">{displayName(user)}</p>
                      <p className="meta truncate text-[11px]">
                        {f.cardMeta(user.handle, formatNumber(watched, locale), match.common)}
                      </p>
                    </div>
                  </div>
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

      {outgoing.length > 0 && (
        <section aria-labelledby="envoyees" className="space-y-4">
          <h2 id="envoyees" className="eyebrow">
            {f.outgoing}
          </h2>
          <ul className="divide-y divide-velvet-800 rounded-2xl border border-velvet-800">
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
  user: { name: string | null; handle: string; bio: string | null };
  children: React.ReactNode;
}) {
  const name = displayName(user);
  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:gap-4">
      <Link href={`/u/${user.handle}`} className="flex min-w-0 flex-1 items-center gap-3 hover:text-tungsten">
        <Avatar name={name} handle={user.handle} />
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
