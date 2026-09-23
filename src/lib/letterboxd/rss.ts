import "server-only";
import { XMLParser } from "fast-xml-parser";
import { AppError } from "@/lib/errors";

export type RssEntry = {
  tmdbId: number;
  title: string;
  year: number | null;
  rating: number | null;
  liked: boolean;
  watchedAt: Date | null;
  rewatch: boolean;
};

const USERNAME_RE = /^[A-Za-z0-9_]{1,40}$/;

export function normalizeUsername(input: string) {
  // Accepte aussi une URL de profil collée par erreur.
  const m = input.trim().match(/letterboxd\.com\/([^/?#]+)/i);
  const username = (m ? m[1] : input.trim()).replace(/^@/, "");
  if (!USERNAME_RE.test(username)) {
    throw new AppError("LB_INVALID_USERNAME", "Ce pseudo Letterboxd n'est pas valide (lettres, chiffres et _ uniquement).");
  }
  return username;
}

type RawItem = Record<string, unknown>;

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());

export function parseRss(xml: string): RssEntry[] {
  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    isArray: (name) => name === "item",
  });
  let doc: { rss?: { channel?: { item?: RawItem[] } } };
  try {
    doc = parser.parse(xml);
  } catch {
    throw new AppError("LB_UNAVAILABLE", "Le flux RSS Letterboxd est illisible.", 502);
  }
  if (!doc?.rss?.channel) {
    throw new AppError("LB_UNAVAILABLE", "La réponse de Letterboxd n'est pas un flux RSS valide.", 502);
  }

  const byId = new Map<number, RssEntry>();
  for (const item of doc.rss.channel.item ?? []) {
    const tmdbId = Number(str(item["tmdb:movieId"]));
    const title = str(item["letterboxd:filmTitle"]);
    // Les listes et entrées sans film (ou séries) n'ont pas de tmdb:movieId.
    if (!tmdbId || !title) continue;

    const ratingRaw = str(item["letterboxd:memberRating"]);
    const dateRaw = str(item["letterboxd:watchedDate"]);
    const entry: RssEntry = {
      tmdbId,
      title,
      year: Number(str(item["letterboxd:filmYear"])) || null,
      rating: ratingRaw ? Number(ratingRaw) : null,
      liked: str(item["letterboxd:memberLike"]).toLowerCase() === "yes",
      watchedAt: dateRaw ? new Date(`${dateRaw}T12:00:00Z`) : null,
      rewatch: str(item["letterboxd:rewatch"]).toLowerCase() === "yes",
    };

    // Plusieurs entrées pour un même film (revisionnage) : on garde la plus récente
    // (le flux est trié du plus récent au plus ancien) et on cumule le like.
    const prev = byId.get(tmdbId);
    if (prev) {
      prev.liked ||= entry.liked;
      prev.rating ??= entry.rating;
    } else {
      byId.set(tmdbId, entry);
    }
  }
  return [...byId.values()];
}

/** Lit le flux RSS public https://letterboxd.com/{pseudo}/rss/ (aucun scraping de page HTML). */
export async function fetchLetterboxdRss(username: string): Promise<RssEntry[]> {
  let res: Response;
  try {
    res = await fetch(`https://letterboxd.com/${encodeURIComponent(username)}/rss/`, {
      headers: { "user-agent": "Watchnext/1.0 (RSS reader)", accept: "application/rss+xml, application/xml" },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch {
    throw new AppError("LB_UNAVAILABLE", "Impossible de joindre Letterboxd. Réessaie dans quelques instants.", 503);
  }
  if (res.status === 404) {
    throw new AppError("LB_USER_NOT_FOUND", `Aucun profil Letterboxd public ne correspond au pseudo « ${username} ».`, 404);
  }
  if (!res.ok) {
    throw new AppError("LB_UNAVAILABLE", `Letterboxd a refusé la requête (${res.status}). Réessaie plus tard.`, 502);
  }
  const entries = parseRss(await res.text());
  if (entries.length === 0) {
    throw new AppError(
      "LB_EMPTY_FEED",
      "Le flux de ce profil ne contient aucun film (journal vide ou privé). Essaie l'import complet.",
    );
  }
  return entries;
}
