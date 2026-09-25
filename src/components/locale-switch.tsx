"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "@/actions/locale";
import { useI18n } from "@/i18n/client";
import { LOCALES } from "@/i18n/config";

/** Interrupteur FR / EN de la barre de navigation : la page se recharge dans la langue choisie. */
export function LocaleSwitch({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="radiogroup"
      aria-label={t.common.language}
      aria-busy={pending}
      className={`flex items-center rounded-full border border-velvet-700 p-0.5 font-mono text-[11px] font-bold ${className}`}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={locale === l}
          lang={l}
          title={t.common.languageNames[l]}
          disabled={pending}
          onClick={() =>
            locale !== l &&
            startTransition(async () => {
              await setLocaleAction(l);
              router.refresh();
            })
          }
          className={`rounded-full px-2.5 py-1 uppercase transition ${
            locale === l ? "bg-tungsten text-velvet-950" : "text-dust-300 hover:text-screen"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
