import "server-only";
import type { Locale } from "@/i18n/config";
import { prisma } from "@/lib/db";
import { ensureManyDetails } from "@/lib/films";
import { language } from "@/lib/tmdb";

/**
 * Les titres et synopsis sont stockés dans la langue TMDB principale (français par défaut).
 * Pour l'interface anglaise, remplace-les par leur version anglaise (titleEn / overviewEn) partout
 * dans un résultat de requête : films inclus, listes, objets imbriqués. Modifie l'objet reçu.
 */
export function localizeFilms<T>(data: T, locale: Locale): T {
  if (locale !== "en" || language().startsWith("en")) return data;
  walk(data, new Set());
  return data;
}

function walk(value: unknown, seen: Set<object>) {
  if (!value || typeof value !== "object" || value instanceof Date || ArrayBuffer.isView(value) || seen.has(value)) {
    return;
  }
  seen.add(value);
  if (value instanceof Map) {
    for (const v of value.values()) walk(v, seen);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) walk(v, seen);
    return;
  }
  const o = value as Record<string, unknown>;
  if (typeof o.titleEn === "string" && o.titleEn && "title" in o) o.title = o.titleEn;
  if (typeof o.overviewEn === "string" && o.overviewEn && "overview" in o) o.overview = o.overviewEn;
  for (const key in o) walk(o[key], seen);
}

type BecauseDetails = { because?: string[]; becauseIds?: number[] };

/**
 * Titres des films à l'origine des recommandations (« Parce que tu as aimé X »), dans la langue de
 * l'interface. Les recommandations calculées avant l'ajout des identifiants gardent leurs titres d'origine.
 */
export async function becauseTitles(list: BecauseDetails[], locale: Locale): Promise<(d: BecauseDetails) => string[]> {
  if (locale !== "en" || language().startsWith("en")) return (d) => d.because ?? [];
  const ids = [...new Set(list.flatMap((d) => d.becauseIds ?? []))];
  const films = ids.length
    ? await prisma.film.findMany({
        where: { tmdbId: { in: ids } },
        select: { tmdbId: true, title: true, titleEn: true },
      })
    : [];
  // Films cités sans titre anglais connu (vus avant son ajout) : récupérés maintenant, une seule fois.
  const missing = films.filter((f) => f.titleEn == null).map((f) => f.tmdbId);
  const fetched = missing.length ? await ensureManyDetails(missing.slice(0, 60), 8, true) : new Map();
  const byId = new Map(films.map((f) => [f.tmdbId, fetched.get(f.tmdbId)?.titleEn || f.titleEn || f.title]));
  return (d) =>
    d.becauseIds?.length
      ? d.becauseIds.map((id, i) => byId.get(id) ?? d.because?.[i] ?? "").filter(Boolean)
      : (d.because ?? []);
}
