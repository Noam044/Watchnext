import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { ChatIcon, FilmIcon, SendIcon } from "@/components/icons";
import { Poster } from "@/components/poster";
import { getSharedFilms } from "@/lib/activity";
import { avatarUrl } from "@/lib/avatar";
import { favoritesNotSeenBy } from "@/lib/friends";
import { getConversations } from "@/lib/messages";
import { requireUser } from "@/lib/session";
import { formatAgo } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { displayName } from "@/lib/users";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.messages.meta };
}

export default async function MessagesPage() {
  const me = await requireUser();
  const [{ t, locale }, conversations, shared] = await Promise.all([
    getI18n(),
    getConversations(me.id),
    getSharedFilms(me.id, 6),
  ]);
  const m = t.messages;
  const started = conversations.filter((c) => c.last);
  const others = conversations.filter((c) => !c.last);
  // Idées d'envoi pour les deux amis avec qui la conversation est la plus récente.
  const ideas = (
    await Promise.all(
      conversations.slice(0, 2).map(async ({ friend }) => ({ friend, films: await favoritesNotSeenBy(me.id, friend.id, 6) })),
    )
  ).filter((i) => i.films.length > 0);

  return (
    <div className={`grid gap-12 lg:gap-16 ${shared.length ? "lg:grid-cols-[minmax(0,1fr)_17rem]" : "max-w-3xl"}`}>
      <div className="min-w-0 space-y-8">
        <header>
          <h1 className="marquee text-6xl sm:text-7xl">{m.title}</h1>
          <p className="mt-3 text-sm text-dust-300">{m.subtitle}</p>
        </header>

        {conversations.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
            <ChatIcon className="size-8 text-dust-400" />
            <p className="marquee text-3xl">{m.emptyTitle}</p>
            <p className="max-w-md text-sm text-dust-300">{m.emptyText}</p>
            <Link href="/friends" className="btn-primary mt-2">
              {m.findFriends}
            </Link>
          </div>
        ) : (
          <>
            {started.length > 0 && (
              <ul className="divide-y divide-velvet-800 border-y border-velvet-800">
                {started.map(({ friend, last, unread }) => (
                  <li key={friend.id}>
                    <Link
                      href={`/messages/${friend.handle}`}
                      className="-mx-3 flex items-center gap-3 rounded-md px-3 py-4 transition hover:bg-velvet-900 sm:gap-4"
                    >
                      <Avatar name={displayName(friend)} handle={friend.handle} src={avatarUrl(friend)} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate ${unread ? "font-bold text-screen" : "font-semibold"}`}>
                            {displayName(friend)}
                          </span>
                          {last && (
                            <span className="meta shrink-0 text-[11px]" suppressHydrationWarning>
                              {formatAgo(last.createdAt.toISOString(), locale)}
                            </span>
                          )}
                        </span>
                        <span className={`mt-0.5 flex items-center gap-2 text-sm ${unread ? "text-screen" : "text-dust-300"}`}>
                          {last?.film && <FilmIcon className="size-3.5 shrink-0 text-dust-400" />}
                          <span className="truncate">
                            {last?.senderId === me.id && m.you}
                            {last?.film ? `${last.film.title}${last.body ? ` · ${last.body}` : ""}` : last?.body}
                          </span>
                          {unread > 0 && (
                            <span className="ml-auto grid min-w-5 shrink-0 place-items-center rounded-full bg-curtain px-1.5 font-mono text-[11px] leading-5 font-bold text-screen">
                              {unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {others.length > 0 && (
              <section aria-labelledby="demarrer" className="space-y-3">
                <h2 id="demarrer" className="text-sm font-semibold text-dust-300">
                  {m.startConversation}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {others.map(({ friend }) => (
                    <li key={friend.id}>
                      <Link href={`/messages/${friend.handle}`} className="chip py-1.5 pr-3 pl-1.5 text-sm">
                        <Avatar name={displayName(friend)} handle={friend.handle} src={avatarUrl(friend)} size="sm" className="size-6! text-[11px]! ring-0!" />
                        {displayName(friend)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {ideas.length > 0 && (
          <section aria-labelledby="idees" className="space-y-6 pt-4">
            <div>
              <h2 id="idees" className="marquee text-3xl">
                {m.ideasTitle}
              </h2>
              <p className="mt-1 max-w-lg text-sm text-dust-300">{m.ideasText}</p>
            </div>
            {ideas.map(({ friend, films }) => {
              const name = displayName(friend);
              return (
                <div key={friend.id}>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Avatar name={name} handle={friend.handle} src={avatarUrl(friend)} size="sm" className="size-6! text-[11px]! ring-0!" />
                    {name}
                  </p>
                  <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {films.map(({ film }) => (
                      <li key={film.id}>
                        <Link
                          href={`/messages/${friend.handle}?film=${film.tmdbId}`}
                          aria-label={m.sendFilmTo(film.title, name)}
                          className="group block"
                        >
                          <Poster
                            path={film.posterPath}
                            title={film.title}
                            size="w185"
                            sizes="(max-width: 640px) 30vw, 110px"
                            className="ring-1 ring-white/5 transition group-hover:ring-tungsten/60"
                          />
                          <span className="mt-1.5 flex items-center gap-1.5 text-xs text-dust-400 transition group-hover:text-tungsten">
                            <SendIcon className="size-3" /> {m.sendFilm}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>
        )}
      </div>

      {shared.length > 0 && (
        <aside aria-labelledby="echanges" className="space-y-4 lg:pt-3">
          <div>
            <h2 id="echanges" className="marquee text-3xl">
              {m.sharedTitle}
            </h2>
            <p className="mt-1 text-sm text-dust-300">{m.sharedText}</p>
          </div>
          <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-6 lg:grid-cols-2">
            {shared.map((s) => (
              <li key={s.id}>
                <Link href={`/film/${s.film.tmdbId}`} className="group block">
                  <Poster
                    path={s.film.posterPath}
                    title={s.film.title}
                    size="w185"
                    sizes="(max-width: 1024px) 30vw, 130px"
                    className="ring-1 ring-white/5 transition group-hover:ring-screen/30"
                  />
                  <p className="mt-2 line-clamp-2 text-sm leading-snug font-semibold group-hover:text-tungsten">
                    {s.film.title}
                  </p>
                </Link>
                <p className="mt-0.5 truncate text-xs text-dust-400">
                  {s.fromMe ? m.sharedTo(displayName(s.recipient)) : m.sharedFrom(displayName(s.sender))}
                </p>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
