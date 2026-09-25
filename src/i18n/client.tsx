"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";

const LocaleContext = createContext<Locale>("fr");

/** Fournit la langue aux composants client ; les dictionnaires sont importés directement (fonctions comprises). */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useI18n() {
  const locale = useContext(LocaleContext);
  return { locale, t: dictionaries[locale] };
}
