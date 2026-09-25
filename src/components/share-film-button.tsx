"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { sendMessageAction, shareTargetsAction } from "@/actions/messages";
import { Avatar } from "@/components/avatar";
import { SendIcon, XIcon } from "@/components/icons";
import { toast } from "@/components/toaster";
import { useI18n } from "@/i18n/client";

type Target = { id: string; name: string; handle: string };

/** « Envoyer à un ami » : choisit un ami, ajoute un mot, et envoie la fiche du film en message. */
export function ShareFilmButton({ tmdbId, title, className = "btn-primary" }: { tmdbId: number; title: string; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();
  const m = t.messages;

  const open = () => {
    ref.current?.showModal();
    if (!targets) shareTargetsAction().then(setTargets, () => setTargets([]));
  };
  const close = () => ref.current?.close();

  const send = () =>
    startTransition(async () => {
      if (!to) return;
      const res = await sendMessageAction({ toUserId: to, tmdbId, body: note });
      if (!res.ok) return toast(res.error, "error");
      toast(m.sentTo(title, targets?.find((x) => x.id === to)?.name ?? m.yourFriend));
      setNote("");
      setTo(null);
      close();
    });

  return (
    <>
      <button type="button" onClick={open} className={className}>
        <SendIcon /> {m.shareButton}
      </button>
      <dialog
        ref={ref}
        aria-label={m.shareLabel(title)}
        onClick={(e) => e.target === e.currentTarget && close()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            close();
          }
        }}
        className="m-0 mt-auto w-full max-w-none rounded-t-lg border border-velvet-700 bg-velvet-900 p-0 text-screen shadow-2xl shadow-black/70 backdrop:bg-black/75 backdrop:backdrop-blur-sm open:animate-rise sm:m-auto sm:max-w-md sm:rounded-lg"
      >
        <div className="flex items-center justify-between border-b border-velvet-800 px-5 py-4">
          <h2 className="marquee text-2xl">{m.shareButton}</h2>
          <button onClick={close} className="grid size-9 place-items-center rounded-full hover:bg-velvet-800" aria-label={t.common.close}>
            <XIcon />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          {targets === null ? (
            <div className="space-y-2" aria-busy="true">
              <div className="skeleton h-12" />
              <div className="skeleton h-12" />
            </div>
          ) : targets.length === 0 ? (
            <p className="text-sm text-dust-300">
              {m.noFriendsYet}{" "}
              <Link href="/friends" className="text-tungsten underline-offset-4 hover:underline">
                {m.findFriends}
              </Link>
            </p>
          ) : (
            <ul role="radiogroup" aria-label={m.recipient} className="max-h-64 space-y-1 overflow-y-auto">
              {targets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={to === t.id}
                    onClick={() => setTo(t.id)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition ${
                      to === t.id ? "bg-tungsten-soft ring-1 ring-tungsten/60" : "hover:bg-velvet-800"
                    }`}
                  >
                    <Avatar name={t.name} handle={t.handle} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{t.name}</span>
                      <span className="meta block truncate text-[11px]">@{t.handle}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="block space-y-1.5">
            <span className="field-label">{m.note}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={2000}
              className="input resize-none"
              placeholder={m.notePlaceholder}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-velvet-800 px-5 py-4">
          <button onClick={close} className="btn-quiet">
            {t.common.cancel}
          </button>
          <button onClick={send} disabled={!to || pending} className="btn-primary">
            {pending ? m.sending : m.send}
          </button>
        </div>
      </dialog>
    </>
  );
}
