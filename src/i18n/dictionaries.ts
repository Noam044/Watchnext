import type { Locale } from "@/i18n/config";
import { auth } from "@/i18n/dict/auth";
import { common, landing, nav } from "@/i18n/dict/common";
import { errors } from "@/i18n/dict/errors";
import { dashboard, film } from "@/i18n/dict/film";
import { errorsPage, filmPage } from "@/i18n/dict/film-page";
import { friends } from "@/i18n/dict/friends";
import { importPage } from "@/i18n/dict/import";
import { messages } from "@/i18n/dict/messages";
import { profile } from "@/i18n/dict/profile";
import { settings } from "@/i18n/dict/settings";

const groups = { common, nav, landing, auth, errors, film, dashboard, importPage, profile, settings, friends, messages, filmPage, errorsPage };

type Groups = typeof groups;
export type Dictionary = { [K in keyof Groups]: Groups[K]["fr"] };

function build(locale: Locale): Dictionary {
  return Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v[locale]])) as Dictionary;
}

/** Tous les textes de l'interface, par langue. */
export const dictionaries: Record<Locale, Dictionary> = { fr: build("fr"), en: build("en") };
