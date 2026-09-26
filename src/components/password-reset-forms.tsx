"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestResetAction, resetPasswordAction } from "@/actions/password";
import { PasswordInput } from "@/components/password-input";
import { useI18n } from "@/i18n/client";

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 space-y-1">
      <h1 className="marquee text-4xl">{title}</h1>
      <p className="text-sm text-dust-300">{subtitle}</p>
    </div>
  );
}

function BackToLogin() {
  const a = useI18n().t.auth;
  return (
    <p className="pt-2 text-center text-sm">
      <Link href="/login" className="font-medium text-tungsten underline-offset-4 hover:underline">
        {a.backToLogin}
      </Link>
    </p>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestResetAction, undefined);
  const a = useI18n().t.auth;
  return (
    <form action={action} className="space-y-4">
      <Heading title={a.forgotTitle} subtitle={a.forgotSubtitle} />
      {state?.ok ? (
        <p role="status" className="rounded-md border border-exit/30 bg-exit/10 px-3 py-2 text-sm text-screen">
          {state.message}
        </p>
      ) : (
        <>
          <label className="block space-y-1.5">
            <span className="field-label">{a.email}</span>
            <input
              name="email"
              type="email"
              required
              className="input"
              autoComplete="email"
              defaultValue={state?.email}
            />
          </label>
          {state?.error && (
            <p role="alert" className="rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
              {state.error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? a.wait : a.forgotSubmit}
          </button>
        </>
      )}
      <BackToLogin />
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  const a = useI18n().t.auth;
  return (
    <form action={action} className="space-y-4">
      <Heading title={a.resetTitle} subtitle={a.resetSubtitle} />
      <input type="hidden" name="token" value={token} />
      <label className="block space-y-1.5">
        <span className="field-label">{a.newPassword}</span>
        <PasswordInput name="password" required minLength={8} autoComplete="new-password" />
        <span className="block text-xs text-dust-400">{a.passwordHint}</span>
      </label>
      {state?.error && (
        <p role="alert" className="rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
          {state.error}{" "}
          {state.error === a.resetInvalid && (
            <Link href="/forgot-password" className="font-medium underline underline-offset-4">
              {a.requestNewLink}
            </Link>
          )}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? a.wait : a.resetSubmit}
      </button>
      <BackToLogin />
    </form>
  );
}
