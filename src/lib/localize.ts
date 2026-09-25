import "server-only";
import type { Locale } from "@/i18n/config";
import { formatList } from "@/i18n/format";
import type { NamedRef } from "@/lib/films";
import { getGenreMap } from "@/lib/tmdb";

/**
 * Traduction des données de films affichées dans l'interface. Les métadonnées sont
 * stockées dans la langue TMDB du serveur (français) : les genres sont retraduits par
 * leur identifiant TMDB, les explications de recommandation d'après leurs modèles.
 */
export type Localizer = {
  genre: (g: NamedRef) => string;
  genreName: (name: string) => string;
  decade: (id: number) => string;
  /** Raison et étiquettes d'une recommandation (`because` : titres des films aimés à l'origine). */
  reco: (reason: string, tags: string[], because?: string[]) => { reason: string; tags: string[] };
};

export async function getLocalizer(locale: Locale): Promise<Localizer> {
  if (locale === "fr") {
    return {
      genre: (g) => g.name,
      genreName: (name) => name,
      decade: (id) => `Années ${id}`,
      reco: (reason, tags) => ({ reason, tags }),
    };
  }

  const [en, fr] = await Promise.all([
    getGenreMap("en-US").catch(() => new Map<number, string>()),
    getGenreMap("fr-FR").catch(() => new Map<number, string>()),
  ]);
  const frToEn = new Map([...fr.entries()].map(([id, name]) => [name.toLowerCase(), en.get(id) ?? name]));
  const genreName = (name: string) => frToEn.get(name.toLowerCase()) ?? name;
  const genreList = (s: string) =>
    formatList(
      s.split(/, | et /).map((g) => genreName(g.trim()).toLowerCase()),
      "en",
    );

  const reason = (text: string, because: string[]) => {
    let m: RegExpMatchArray | null;
    if (text.startsWith("Parce que tu as aimé")) {
      return `Because you liked ${because.length ? formatList(because, "en") : text.replace("Parce que tu as aimé ", "")}`;
    }
    if ((m = text.match(/^Parce que tu apprécies les films de (.+)$/))) return `Because you enjoy films by ${m[1]}`;
    if (text === "Dans ta watchlist et proche de tes goûts") return "On your watchlist and close to your taste";
    if ((m = text.match(/^Correspond à ton goût pour (.+)$/))) return `Matches your taste for ${genreList(m[1])}`;
    if (text === "Très bien noté et proche de tes goûts") return "Highly rated and close to your taste";
    return text;
  };
  const tag = (text: string) => {
    let m: RegExpMatchArray | null;
    if ((m = text.match(/^Réalisé par (.+)$/))) return `Directed by ${m[1]}`;
    if ((m = text.match(/^Avec (.+)$/))) return `Starring ${m[1]}`;
    if (text === "Dans ta watchlist") return "On your watchlist";
    return text
      .split(" · ")
      .map((g) => genreName(g))
      .join(" · ");
  };

  return {
    genre: (g: NamedRef) => en.get(g.id) ?? g.name,
    genreName,
    decade: (id: number) => `${id}s`,
    reco: (text, tags, because = []) => ({ reason: reason(text, because), tags: tags.map(tag) }),
  };
}
