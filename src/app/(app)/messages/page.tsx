import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { ChatIcon } from "@/components/icons";
import { getConversations } from "@/lib/messages";
import { requireUser } from "@/lib/session";
import { formatAgo } from "@/lib/text";
import { displayName } from "@/lib/users";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const me = await requireUser();
  const conversations = await getConversations(me.id);
  const started = conversations.filter((c) => c.last);
  const others = conversations.filter((c) => !c.last);

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header>
        <p className="eyebrow">Entre amis seulement</p>
        <h1 className="marquee mt-1 text-6xl sm:text-7xl">Messages</h1>
      </header>

      {conversations.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <ChatIcon className="size-8 text-dust-400" />
          <p className="marquee text-3xl">Personne à qui écrire</p>
          <p className="max-w-md text-sm text-dust-300">
            La messagerie est réservée à tes amis. Ajoute des amis pour discuter et vous envoyer des films.
          </p>
          <Link href="/friends" className="btn-primary mt-2">
            Trouver des amis
          </Link>
        </div>
      ) : (
        <>
          {started.length > 0 && (
            <ul className="divide-y divide-velvet-800 rounded-2xl border border-velvet-800 bg-velvet-900/60">
              {started.map(({ friend, last, unread }) => (
                <li key={friend.id}>
                  <Link href={`/messages/${friend.handle}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-velvet-850 sm:gap-4">
                    <Avatar name={displayName(friend)} handle={friend.handle} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate ${unread ? "font-bold text-screen" : "font-semibold"}`}>{displayName(friend)}</span>
                        {last && (
                          <span className="meta shrink-0 text-[11px]" suppressHydrationWarning>
                            {formatAgo(last.createdAt.toISOString())}
                          </span>
                        )}
                      </span>
                      <span className={`mt-0.5 flex items-center gap-2 text-sm ${unread ? "text-screen" : "text-dust-300"}`}>
                        <span className="truncate">
                          {last?.senderId === me.id && "Toi : "}
                          {last?.film ? `🎬 ${last.film.title}${last.body ? ` · ${last.body}` : ""}` : last?.body}
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
              <h2 id="demarrer" className="eyebrow">
                Démarrer une conversation
              </h2>
              <ul className="flex flex-wrap gap-2">
                {others.map(({ friend }) => (
                  <li key={friend.id}>
                    <Link href={`/messages/${friend.handle}`} className="chip py-1.5 pr-3.5 pl-1.5">
                      <Avatar name={displayName(friend)} handle={friend.handle} size="sm" className="size-6! text-[11px]! ring-0!" />
                      {displayName(friend)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
