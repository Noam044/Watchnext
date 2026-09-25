"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { pollThreadAction, searchMyFilmsAction, sendMessageAction, type MessageDTO } from "@/actions/messages";
import { FilmIcon, SendIcon, XIcon } from "@/components/icons";
import { Poster } from "@/components/poster";
import { Stars } from "@/components/stars";
import { toast } from "@/components/toaster";
import { useI18n } from "@/i18n/client";
import { dateFormat } from "@/i18n/format";

const POLL_MS = 4000;

type FilmChoice = { tmdbId: number; title: string; year: number | null; posterPath: string | null; rating: number | null };

/** Fil de discussion avec un ami : messages, films partagés, envoi et mise à jour automatique. */
export function Thread({ friend, initial }: { friend: { id: string; name: string }; initial: MessageDTO[] }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const m = t.messages;
  const dayFmt = dateFormat(locale, { weekday: "long", day: "numeric", month: "long" });
  const timeFmt = dateFormat(locale, { hour: "2-digit", minute: "2-digit" });
  const [messages, setMessages] = useState(initial);
  const [body, setBody] = useState("");
  const [film, setFilm] = useState<FilmChoice | null>(null);
  const [picking, setPicking] = useState(false);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const lastAt = messages.at(-1)?.createdAt ?? null;

  // Nouveaux messages : on interroge le serveur tant que l'onglet est visible.
  const poll = useCallback(async () => {
    const res = await pollThreadAction(friend.id, lastAt).catch(() => null);
    if (!res?.ok || res.data.messages.length === 0) return;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      const fresh = res.data.messages.filter((m) => !known.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, [friend.id, lastAt]);

  useEffect(() => {
    const timer = setInterval(() => document.visibilityState === "visible" && poll(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // La page vient de marquer ces messages comme lus : on met à jour la pastille de la navigation.
  const hadUnread = initial.some((m) => !m.mine && !m.read);
  useEffect(() => {
    if (hadUnread) router.refresh();
  }, [hadUnread, router]);

  const send = () =>
    startTransition(async () => {
      if (!body.trim() && !film) return;
      const res = await sendMessageAction({ toUserId: friend.id, body, tmdbId: film?.tmdbId });
      if (!res.ok) return toast(res.error, "error");
      setMessages((prev) => [...prev, res.data.message]);
      setBody("");
      setFilm(null);
    });

  const lastMineId = [...messages].reverse().find((m) => m.mine)?.id;

  return (
    <>
      <ol aria-label={m.conversationWith(friend.name)} className="flex min-h-[40vh] flex-col gap-2 py-6">
        {messages.length === 0 && (
          <li className="m-auto max-w-xs text-center text-sm text-dust-300">
            {m.emptyThread(friend.name)}
          </li>
        )}
        {messages.map((msg, i) => {
          const day = dayFmt.format(new Date(msg.createdAt));
          const newDay = i === 0 || dayFmt.format(new Date(messages[i - 1].createdAt)) !== day;
          return (
            <li key={msg.id} className="contents">
              {newDay && (
                <p className="eyebrow my-3 text-center text-[10px]" suppressHydrationWarning>
                  {day}
                </p>
              )}
              <div className={`flex max-w-[85%] flex-col gap-1 ${msg.mine ? "items-end self-end" : "items-start self-start"}`}>
                {msg.film && <SharedFilm film={msg.film} mine={msg.mine} />}
                {msg.body && (
                  <p
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                      msg.mine ? "rounded-br-md bg-tungsten text-velvet-950" : "rounded-bl-md bg-velvet-800 text-screen"
                    }`}
                  >
                    {msg.body}
                  </p>
                )}
                <span className="meta px-1 text-[10px] text-dust-400" suppressHydrationWarning>
                  {timeFmt.format(new Date(msg.createdAt))}
                  {msg.id === lastMineId && msg.read && m.read}
                </span>
              </div>
            </li>
          );
        })}
        {/* Marge de défilement : le dernier message reste visible au-dessus de la zone de saisie (et des onglets sur mobile). */}
        <div ref={endRef} className="scroll-mb-48 md:scroll-mb-32" />
      </ol>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] rounded-2xl border border-velvet-700 bg-velvet-900/95 p-2 shadow-2xl shadow-black/60 backdrop-blur md:bottom-4"
      >
        {film && (
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-velvet-850 p-2">
            <Poster path={film.posterPath} title={film.title} size="w185" sizes="40px" className="w-10 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-sm">
              <span className="font-semibold">{film.title}</span> <span className="meta">{film.year ?? ""}</span>
            </span>
            <button type="button" onClick={() => setFilm(null)} className="grid size-8 place-items-center rounded-full hover:bg-velvet-700" aria-label={m.removeFilm}>
              <XIcon />
            </button>
          </div>
        )}
        {picking && (
          <FilmPicker
            onPick={(f) => {
              setFilm(f);
              setPicking(false);
            }}
            onClose={() => setPicking(false)}
          />
        )}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setPicking((v) => !v)}
            aria-expanded={picking}
            className="grid size-10 shrink-0 place-items-center rounded-full text-dust-300 transition hover:bg-velvet-800 hover:text-screen"
            aria-label={m.attachFilm}
            title={m.attachFilmTitle}
          >
            <FilmIcon className="size-5" />
          </button>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={m.writeTo(friend.name)}
            aria-label={m.message}
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-screen [field-sizing:content] placeholder:text-dust-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || (!body.trim() && !film)}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-tungsten text-velvet-950 transition hover:bg-tungsten-strong disabled:opacity-40"
            aria-label={m.send}
          >
            <SendIcon className="size-4.5" />
          </button>
        </div>
      </form>
    </>
  );
}

function SharedFilm({ film, mine }: { film: NonNullable<MessageDTO["film"]>; mine: boolean }) {
  const m = useI18n().t.messages;
  return (
    <Link
      href={`/film/${film.tmdbId}`}
      className={`group flex w-64 items-center gap-3 rounded-2xl border p-2 pr-4 transition ${
        mine ? "border-tungsten/40 bg-tungsten-soft" : "border-velvet-700 bg-velvet-850"
      } hover:border-tungsten`}
    >
      <Poster path={film.posterPath} title={film.title} size="w185" sizes="56px" className="w-14 shrink-0" />
      <span className="min-w-0">
        <span className="eyebrow block text-[9px]">{m.sharedFilm}</span>
        <span className="block truncate font-semibold group-hover:text-tungsten">{film.title}</span>
        <span className="meta block text-[11px]">{film.year ?? ""} · {m.seeFilm}</span>
      </span>
    </Link>
  );
}

/** Choix d'un film de sa bibliothèque : coups de cœur par défaut, recherche par titre. */
function FilmPicker({ onPick, onClose }: { onPick: (f: FilmChoice) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FilmChoice[] | null>(null);
  const { t } = useI18n();
  const m = t.messages;

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      searchMyFilmsAction(q).then((r) => !cancelled && setResults(r), () => !cancelled && setResults([]));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="mb-2 rounded-xl border border-velvet-700 bg-velvet-950/80 p-2">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          placeholder={m.searchMyFilms}
          aria-label={m.searchMyFilmsLabel}
          className="input rounded-full py-2"
        />
        <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-velvet-800" aria-label={t.common.close}>
          <XIcon />
        </button>
      </div>
      <ul className="mt-2 max-h-56 overflow-y-auto">
        {results === null ? (
          <li className="meta px-2 py-3">{t.common.loading}</li>
        ) : results.length === 0 ? (
          <li className="meta px-2 py-3">{q ? m.noLibraryMatch : m.noFavorites}</li>
        ) : (
          results.map((f) => (
            <li key={f.tmdbId}>
              <button
                type="button"
                onClick={() => onPick(f)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-velvet-800"
              >
                <Poster path={f.posterPath} title={f.title} size="w185" sizes="32px" className="w-8 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {f.title} <span className="meta">{f.year ?? ""}</span>
                </span>
                {f.rating != null && <Stars value={f.rating} className="text-xs" />}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
