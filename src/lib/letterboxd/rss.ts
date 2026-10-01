import "server-only";
import { XMLParser } from "fast-xml-parser";
import { AppError } from "@/lib/errors";

export type RssEntry = {
  tmdbId: number;
  title: string;
  year: number | null;
  rating: number | null;
  /** Date du visionnage qui porte la note. */
  ratedAt: Date | null;
  liked: boolean;
  watchedAt: Date | null;
  rewatch: boolean;
  review: string | null;
  reviewSpoilers: boolean;
};

const USERNAME_RE = /^[A-Za-z0-9_]{1,40}$/;

export function normalizeUsername(input: string) {
  // Accepte aussi une URL de profil collée par erreur.
  const m = input.trim().match(/letterboxd\.com\/([^/?#]+)/i);
  const username = (m ? m[1] : input.trim()).replace(/^@/, "");
  if (!USERNAME_RE.test(username)) {
    throw new AppError("LB_INVALID_USERNAME", "lbInvalidUsername");
  }
  return username;
}

type RawItem = Record<string, unknown>;

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/**
 * Texte de la critique contenu dans la description d'une entrée : l'affiche puis un
 * paragraphe par bloc de texte. Les entrées sans critique n'ont que « Watched on … ».
 */
export function parseReview(descriptionHtml: string): { review: string | null; spoilers: boolean } {
  const paragraphs = [...descriptionHtml.matchAll(/<p>([\s\S]*?)<\/p>/gi)]
    .map((m) => m[1])
    .filter((p) => !/<img\b/i.test(p))
    .map((p) =>
      decodeEntities(
        p
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/[ \t]+\n/g, "\n"),
      ).trim(),
    )
    .filter(Boolean);
  let spoilers = false;
  const body = paragraphs.filter((p) => {
    if (/^This review may contain spoilers\.?$/i.test(p)) {
      spoilers = true;
      return false;
    }
    return true;
  });
  const onlyLogLine = body.length === 1 && /^(Watched|Rewatched|Added|Liked) (on|to)\b/i.test(body[0]);
  if (body.length === 0 || onlyLogLine) return { review: null, spoilers: false };
  return { review: body.join("\n\n").slice(0, 10_000), spoilers };
}

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
    throw new AppError("LB_UNAVAILABLE", "lbFeedUnreadable", {}, 502);
  }
  if (!doc?.rss?.channel) {
    throw new AppError("LB_UNAVAILABLE", "lbNotRss", {}, 502);
  }

  const byId = new Map<number, RssEntry>();
  for (const item of doc.rss.channel.item ?? []) {
    const tmdbId = Number(str(item["tmdb:movieId"]));
    const title = str(item["letterboxd:filmTitle"]);
    // Les listes et entrées sans film (ou séries) n'ont pas de tmdb:movieId.
    if (!tmdbId || !title) continue;

    const ratingRaw = str(item["letterboxd:memberRating"]);
    const { review, spoilers } = parseReview(str(item["description"]));
    const dateRaw = str(item["letterboxd:watchedDate"]);
    const watchedAt = dateRaw ? new Date(`${dateRaw}T12:00:00Z`) : null;
    const rating = ratingRaw ? Number(ratingRaw) : null;
    const entry: RssEntry = {
      tmdbId,
      title,
      year: Number(str(item["letterboxd:filmYear"])) || null,
      rating,
      ratedAt: rating != null ? watchedAt : null,
      liked: str(item["letterboxd:memberLike"]).toLowerCase() === "yes",
      watchedAt,
      rewatch: str(item["letterboxd:rewatch"]).toLowerCase() === "yes",
      review,
      reviewSpoilers: spoilers || /\(contains spoilers\)/i.test(str(item["title"])),
    };

    // Plusieurs entrées pour un même film (revisionnage) : on garde la plus récente
    // (le flux est trié du plus récent au plus ancien) et on cumule le like.
    const prev = byId.get(tmdbId);
    if (prev) {
      prev.liked ||= entry.liked;
      if (prev.rating == null && entry.rating != null) {
        prev.rating = entry.rating;
        prev.ratedAt = entry.ratedAt;
      }
      // Critique la plus récente : celle d'une entrée plus ancienne ne sert que s'il n'y en a pas.
      if (!prev.review && entry.review) {
        prev.review = entry.review;
        prev.reviewSpoilers = entry.reviewSpoilers;
      }
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
    throw new AppError("LB_UNAVAILABLE", "lbUnreachable", {}, 503);
  }
  if (res.status === 404) {
    throw new AppError("LB_USER_NOT_FOUND", "lbUserNotFound", { username }, 404);
  }
  if (!res.ok) {
    throw new AppError("LB_UNAVAILABLE", "lbRefused", { status: res.status }, 502);
  }
  const entries = parseRss(await res.text());
  if (entries.length === 0) {
    throw new AppError("LB_EMPTY_FEED", "lbEmptyFeed");
  }
  return entries;
}
