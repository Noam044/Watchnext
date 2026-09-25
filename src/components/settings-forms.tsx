"use client";

import Image from "next/image";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  setEmblemAction,
  updateEmailAction,
  updatePasswordAction,
  updateProfileAction,
  type FormState,
} from "@/actions/profile";
import { CheckIcon } from "@/components/icons";
import { PasswordInput } from "@/components/password-input";
import { toast } from "@/components/toaster";
import { useI18n } from "@/i18n/client";
import { backdropUrl } from "@/lib/tmdb-images";

function useFormFeedback(state: FormState) {
  useEffect(() => {
    if (state?.ok && state.message) toast(state.message);
  }, [state]);
}

function ErrorLine({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
      {state.error}
    </p>
  );
}

type ProfileDefaults = { name: string; handle: string; bio: string; letterboxd: string; publicProfile: boolean };

export function ProfileForm({ defaults }: { defaults: ProfileDefaults }) {
  const [state, action, pending] = useActionState(updateProfileAction, undefined);
  const [bio, setBio] = useState(defaults.bio);
  const s = useI18n().t.settings;
  useFormFeedback(state);

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="field-label">{s.displayName}</span>
          <input name="name" className="input" defaultValue={defaults.name} maxLength={60} autoComplete="name" />
        </label>
        <label className="block space-y-1.5">
          <span className="field-label">{s.handle}</span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-dust-400">@</span>
            <input
              name="handle"
              className="input pl-8"
              defaultValue={defaults.handle}
              required
              pattern="[a-zA-Z0-9_]{3,24}"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <span className="block text-xs text-dust-400">{s.handleHint}</span>
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="flex items-baseline justify-between">
          <span className="field-label">{s.bio}</span>
          <span className={`font-mono text-[11px] ${bio.length > 280 ? "text-bad" : "text-dust-400"}`}>{bio.length}/280</span>
        </span>
        <textarea
          name="bio"
          rows={3}
          className="input resize-y"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={s.bioPlaceholder}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="field-label">{s.letterboxd}</span>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-dust-400">
            letterboxd.com/
          </span>
          <input
            name="letterboxd"
            className="input pl-[7.4rem]"
            defaultValue={defaults.letterboxd}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <span className="block text-xs text-dust-400">{s.letterboxdHint}</span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-velvet-700 p-4 transition hover:border-velvet-600">
        <input
          type="checkbox"
          name="publicProfile"
          defaultChecked={defaults.publicProfile}
          className="mt-0.5 size-4 shrink-0 accent-tungsten"
        />
        <span>
          <span className="block text-sm font-medium">{s.publicTitle}</span>
          <span className="mt-0.5 block text-sm text-dust-300">{s.publicText}</span>
        </span>
      </label>

      <ErrorLine state={state} />
      <button className="btn-primary" disabled={pending}>
        {pending ? s.saving : s.saveProfile}
      </button>
    </form>
  );
}

type EmblemOption = { filmId: string; title: string; year: number | null; backdropPath: string | null; rating: number | null };

export function EmblemPicker({ options, selected }: { options: EmblemOption[]; selected: string | null }) {
  const [current, setCurrent] = useState(selected);
  const [pending, startTransition] = useTransition();
  const s = useI18n().t.settings;

  const choose = (filmId: string | null) =>
    startTransition(async () => {
      const previous = current;
      setCurrent(filmId);
      const res = await setEmblemAction(filmId);
      if (!res.ok) {
        setCurrent(previous);
        toast(res.error, "error");
      } else toast(filmId ? s.emblemSaved : s.emblemAuto);
    });

  if (options.length === 0) {
    return (
      <p className="text-sm text-dust-300">
        {s.emblemEmpty}
      </p>
    );
  }

  return (
    <div role="radiogroup" aria-label={s.sectionEmblem} aria-busy={pending} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <button
        role="radio"
        aria-checked={current === null}
        onClick={() => choose(null)}
        className={`relative grid aspect-[2.39/1] place-items-center rounded-md border border-dashed text-center text-xs transition ${
          current === null ? "border-tungsten bg-tungsten-soft text-tungsten" : "border-velvet-600 text-dust-300 hover:border-dust-400"
        }`}
      >
        <span>
          <span className="block font-semibold">{s.automatic}</span>
          <span className="block opacity-80">{s.automaticHint}</span>
        </span>
      </button>
      {options.map((o) => {
        const active = current === o.filmId;
        const src = backdropUrl(o.backdropPath, "w300");
        return (
          <button
            key={o.filmId}
            role="radio"
            aria-checked={active}
            onClick={() => choose(o.filmId)}
            className={`group relative aspect-[2.39/1] overflow-hidden rounded-md bg-black text-left ring-2 transition ${
              active ? "ring-tungsten" : "ring-transparent hover:ring-velvet-600"
            }`}
          >
            {src && <Image src={src} alt="" fill sizes="(max-width: 640px) 45vw, 240px" className="object-cover transition group-hover:scale-105" />}
            <span className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent" />
            <span className="absolute inset-x-2 bottom-1.5 truncate text-[11px] font-semibold text-screen">
              {o.title} {o.year && <span className="font-mono font-normal opacity-70">{o.year}</span>}
            </span>
            {active && (
              <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-tungsten text-velvet-950">
                <CheckIcon className="size-3.5" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function EmailForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(updateEmailAction, undefined);
  const s = useI18n().t.settings;
  useFormFeedback(state);
  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-dust-300">
        {s.currentEmail} <span className="text-screen">{email}</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="field-label">{s.newEmail}</span>
          <input name="email" type="email" required className="input" autoComplete="email" />
        </label>
        <label className="block space-y-1.5">
          <span className="field-label">{s.currentPassword}</span>
          <PasswordInput name="password" required autoComplete="current-password" />
        </label>
      </div>
      <ErrorLine state={state} />
      <button className="btn-ghost" disabled={pending}>
        {pending ? s.updating : s.changeEmail}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, undefined);
  const { t } = useI18n();
  const s = t.settings;
  useFormFeedback(state);
  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-1.5 sm:max-w-[calc(50%-0.5rem)]">
        <span className="field-label">{s.currentPassword}</span>
        <PasswordInput name="current" required autoComplete="current-password" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="field-label">{s.newPassword}</span>
          <PasswordInput name="next" required minLength={8} autoComplete="new-password" />
          <span className="block text-xs text-dust-400">{t.auth.passwordHint}</span>
        </label>
        <label className="block space-y-1.5">
          <span className="field-label">{s.confirmation}</span>
          <PasswordInput name="confirm" required minLength={8} autoComplete="new-password" />
        </label>
      </div>
      <ErrorLine state={state} />
      <button className="btn-ghost" disabled={pending}>
        {pending ? s.updating : s.changePassword}
      </button>
    </form>
  );
}
