export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
/** Cookie qui mémorise la langue choisie (un an). */
export const LOCALE_COOKIE = "wn_locale";

/** Étiquette Intl de chaque langue (dates, nombres, listes). */
export const INTL: Record<Locale, string> = { fr: "fr-FR", en: "en-GB" };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Déclare un groupe de textes dans les deux langues ; l'anglais doit avoir la même forme que le français. */
export function pair<T>(fr: T, en: NoInfer<T>) {
  return { fr, en };
}
