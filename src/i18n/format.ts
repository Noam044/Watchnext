import { INTL, type Locale } from "@/i18n/config";

/** « A, B et C » / « A, B and C » */
export function formatList(items: string[], locale: Locale) {
  return new Intl.ListFormat(INTL[locale], { style: "long", type: "conjunction" }).format(items);
}

/** « il y a 2 heures », « hier »… / « 2 hours ago », « yesterday »… à partir d'une date ISO. */
export function formatAgo(iso: string, locale: Locale) {
  const rtf = new Intl.RelativeTimeFormat(INTL[locale], { numeric: "auto" });
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return locale === "fr" ? "à l'instant" : "just now";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

export function dateFormat(locale: Locale, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(INTL[locale], options);
}

export function formatNumber(n: number, locale: Locale, options?: Intl.NumberFormatOptions) {
  return n.toLocaleString(INTL[locale], options);
}

/** Note Letterboxd : « 3,5 » / « 3.5 » */
export function formatRating(value: number, locale: Locale) {
  return value.toLocaleString(INTL[locale], { maximumFractionDigits: 1 });
}
