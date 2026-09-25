"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { useI18n } from "@/i18n/client";

/** Champ mot de passe avec un bouton pour afficher ou masquer la saisie. */
export function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  const { t } = useI18n();
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`input pr-12 ${props.className ?? ""}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
        aria-pressed={visible}
        className="absolute inset-y-0 right-1 my-auto grid size-10 place-items-center rounded-lg text-dust-400 transition hover:text-screen"
      >
        {visible ? <EyeOffIcon className="size-4.5" /> : <EyeIcon className="size-4.5" />}
      </button>
    </div>
  );
}
