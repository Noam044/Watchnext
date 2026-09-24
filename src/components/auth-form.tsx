"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type AuthFormState } from "@/actions/auth";
import { PasswordInput } from "@/components/password-input";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    mode === "login" ? loginAction : registerAction,
    undefined,
  );
  const isRegister = mode === "register";

  return (
    <form action={action} className="space-y-4">
      <div className="mb-6 space-y-1">
        <h1 className="marquee text-4xl">{isRegister ? "Créer un compte" : "Bon retour en salle"}</h1>
        <p className="text-sm text-dust-300">
          {isRegister ? "Ensuite, tu importes ton Letterboxd." : "Connecte-toi pour voir tes recommandations."}
        </p>
      </div>

      {isRegister && (
        <label className="block space-y-1.5">
          <span className="field-label">Prénom (optionnel)</span>
          <input name="name" className="input" autoComplete="given-name" defaultValue={state?.fields?.name} />
        </label>
      )}
      <label className="block space-y-1.5">
        <span className="field-label">Email</span>
        <input
          name="email"
          type="email"
          required
          className="input"
          autoComplete="email"
          defaultValue={state?.fields?.email}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="field-label">Mot de passe</span>
        <PasswordInput
          name="password"
          required
          minLength={isRegister ? 8 : undefined}
          autoComplete={isRegister ? "new-password" : "current-password"}
        />
        {isRegister && <span className="block text-xs text-dust-400">8 caractères minimum.</span>}
      </label>

      {state?.error && (
        <p role="alert" className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Un instant…" : isRegister ? "Créer mon compte" : "Se connecter"}
      </button>

      <p className="pt-2 text-center text-sm text-dust-300">
        {isRegister ? "Déjà inscrit ? " : "Pas encore de compte ? "}
        <Link href={isRegister ? "/login" : "/register"} className="font-medium text-tungsten underline-offset-4 hover:underline">
          {isRegister ? "Se connecter" : "Créer un compte"}
        </Link>
      </p>
    </form>
  );
}
