import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { BackButton } from "@/components/back-button";
import { LockIcon, UsersIcon } from "@/components/icons";
import { Thread, type FilmChoice } from "@/components/thread";
import { getI18n } from "@/i18n/server";
import { avatarUrl } from "@/lib/avatar";
import { prisma } from "@/lib/db";
import { canMessage, getThread, markThreadRead } from "@/lib/messages";
import { requireUser } from "@/lib/session";
import { displayName } from "@/lib/users";

const getUser = (handle: string) =>
  prisma.user.findUnique({
    where: { handle: decodeURIComponent(handle).toLowerCase() },
    select: { id: true, name: true, handle: true, avatarAt: true },
  });

export async function generateMetadata({ params }: PageProps<"/messages/[handle]">): Promise<Metadata> {
  const user = await getUser((await params).handle);
  const m = (await getI18n()).t.messages;
  return { title: user ? m.metaThread(displayName(user)) : m.meta };
}

/** Film à joindre d'office (?film=tmdbId), avec la note que lui a donnée l'utilisateur. */
async function filmToAttach(raw: string | string[] | undefined, userId: string): Promise<FilmChoice | null> {
  const tmdbId = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return null;
  const film = await prisma.film.findUnique({
    where: { tmdbId },
    select: { tmdbId: true, title: true, year: true, posterPath: true, userFilms: { where: { userId }, select: { rating: true } } },
  });
  if (!film) return null;
  const { userFilms, ...rest } = film;
  return { ...rest, rating: userFilms[0]?.rating ?? null };
}

export default async function ThreadPage({ params, searchParams }: PageProps<"/messages/[handle]">) {
  const me = await requireUser();
  const friend = await getUser((await params).handle);
  if (!friend || friend.id === me.id) notFound();
  const name = displayName(friend);
  const { t } = await getI18n();
  const m = t.messages;

  if (!(await canMessage(me.id, friend.id))) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <BackButton />
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <LockIcon className="size-7 text-dust-400" />
          <p className="marquee text-3xl">{m.friendsOnlyTitle}</p>
          <p className="max-w-md text-sm text-dust-300">{m.friendsOnlyText(name)}</p>
          <Link href={`/u/${friend.handle}`} className="btn-primary mt-2">
            {m.seeProfile}
          </Link>
        </div>
      </div>
    );
  }

  const [messages, initialFilm] = await Promise.all([
    getThread(me.id, friend.id),
    filmToAttach((await searchParams).film, me.id),
  ]);
  await markThreadRead(me.id, friend.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <header className="flex items-center gap-3 border-b border-velvet-800 pb-4">
        <BackButton label="" />
        <Link href={`/u/${friend.handle}`} className="flex min-w-0 items-center gap-3 hover:text-tungsten">
          <Avatar name={name} handle={friend.handle} src={avatarUrl(friend)} />
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold">{name}</span>
            <span className="meta block truncate text-[11px]">@{friend.handle}</span>
          </span>
        </Link>
        <Link href={`/duo/${friend.handle}`} className="btn-ghost ml-auto shrink-0 px-3 py-2 text-xs">
          <UsersIcon className="size-3.5" /> {t.duo.open}
        </Link>
      </header>
      <Thread
        friend={{ id: friend.id, name }}
        initialFilm={initialFilm}
        initial={messages.map((m) => ({
          id: m.id,
          mine: m.senderId === me.id,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          read: !!m.readAt,
          film: m.film
            ? { tmdbId: m.film.tmdbId, title: m.film.title, year: m.film.year, posterPath: m.film.posterPath }
            : null,
        }))}
      />
    </div>
  );
}
