import Papa from "papaparse";
import { unzipSync, strFromU8 } from "fflate";
import { AppError } from "@/lib/errors";
import { normalizeTitle } from "@/lib/text";

export type ExportEntry = {
  title: string;
  year: number | null;
  letterboxdUri: string | null;
  watched: boolean;
  inWatchlist: boolean;
  rating: number | null;
  /** Date de la note : visionnage du journal qui la porte, ou date de ratings.csv. */
  ratedAt: Date | null;
  liked: boolean;
  watchedAt: Date | null;
  review: string | null;
  reviewedAt: Date | null;
};

type Kind = "watched" | "ratings" | "diary" | "reviews" | "watchlist" | "likes";
type Row = Record<string, string>;

export type ExportFile = { name: string; content: string };

const KNOWN: Record<string, Kind> = {
  "watched.csv": "watched",
  "ratings.csv": "ratings",
  "diary.csv": "diary",
  "reviews.csv": "reviews",
  "watchlist.csv": "watchlist",
  "likes/films.csv": "likes",
};

/** Décompresse une archive d'export et garde les CSV utiles (hors dossiers deleted/ et orphaned/). */
export function filesFromZip(buffer: Uint8Array): ExportFile[] {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(buffer, {
      filter: (f) => f.name.toLowerCase().endsWith(".csv"),
    });
  } catch {
    throw new AppError("CSV_INVALID", "zipUnreadable");
  }
  return Object.entries(entries).map(([name, data]) => ({ name, content: strFromU8(data) }));
}

// Sous-dossiers de l'export : fichiers supprimés ou orphelins, likes et listes. Leurs CSV peuvent
// porter le même nom qu'un fichier racine (likes/reviews.csv = critiques d'autrui likées).
const SUBFOLDER = /(^|\/)(deleted|orphaned|likes|lists)\//i;
const DISCARDED = /(^|\/)(deleted|orphaned)\//i;

function kindOf(file: ExportFile, headers: string[]): Kind | null {
  // Chemin relatif à la racine de l'export (l'archive peut contenir un dossier parent).
  const path = file.name.replace(/\\/g, "/").toLowerCase();
  if (DISCARDED.test(path)) return null;
  for (const [suffix, kind] of Object.entries(KNOWN)) {
    if (suffix.includes("/") && (path === suffix || path.endsWith(`/${suffix}`))) return kind;
  }
  // Seul likes/films.csv est exploitable parmi les sous-dossiers.
  if (SUBFOLDER.test(path)) return null;
  const name = path.split("/").pop()!;
  if (name in KNOWN) return KNOWN[name];
  // Nom inattendu (fichier renommé) : on devine d'après les colonnes quand c'est possible.
  if (headers.includes("Review")) return "reviews";
  if (headers.includes("Watched Date")) return "diary";
  if (headers.includes("Rating") && !headers.includes("Rewatch")) return "ratings";
  return null;
}

function parseCsv(file: ExportFile): { headers: string[]; rows: Row[] } {
  const res = Papa.parse<Row>(file.content.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const fatal = res.errors.find((e) => e.type !== "FieldMismatch");
  if (fatal) {
    throw new AppError("CSV_INVALID", "csvInvalid", { file: file.name, row: (fatal.row ?? 0) + 2 });
  }
  return { headers: res.meta.fields ?? [], rows: res.data };
}

function parseDate(s: string | undefined) {
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const d = new Date(`${s.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseRating(s: string | undefined) {
  const n = Number(s);
  return s && Number.isFinite(n) && n > 0 && n <= 5 ? n : null;
}

/**
 * Transforme les CSV d'un export Letterboxd en une liste de films dédoublonnés
 * (clé : titre normalisé + année). Lève CSV_INVALID si rien d'exploitable.
 */
export function parseLetterboxdExport(files: ExportFile[]): { entries: ExportEntry[]; used: string[] } {
  const map = new Map<string, ExportEntry>();
  const used: string[] = [];
  const unknown: string[] = [];

  const get = (row: Row) => {
    const title = row["Name"]?.trim();
    if (!title) return null;
    const year = Number(row["Year"]) || null;
    const key = `${normalizeTitle(title)}|${year ?? ""}`;
    let e = map.get(key);
    if (!e) {
      e = {
        title,
        year,
        letterboxdUri: null,
        watched: false,
        inWatchlist: false,
        rating: null,
        ratedAt: null,
        liked: false,
        watchedAt: null,
        review: null,
        reviewedAt: null,
      };
      map.set(key, e);
    }
    return e;
  };

  // Ordre de traitement : ratings.csv (note actuelle) après diary.csv (notes historiques).
  const order: Kind[] = ["watched", "diary", "reviews", "ratings", "likes", "watchlist"];
  const parsed = files
    .map((file) => {
      const csv = parseCsv(file);
      return { file, ...csv, kind: kindOf(file, csv.headers) };
    })
    .filter((p) => {
      if (!p.kind && !SUBFOLDER.test(p.file.name.replace(/\\/g, "/"))) unknown.push(p.file.name);
      return p.kind;
    })
    .sort((a, b) => order.indexOf(a.kind!) - order.indexOf(b.kind!));

  for (const { file, headers, rows, kind } of parsed) {
    if (!headers.includes("Name") || !headers.includes("Year")) {
      throw new AppError("CSV_INVALID", "notLetterboxdFile", { file: file.name });
    }
    used.push(file.name);

    for (const row of rows) {
      const e = get(row);
      if (!e) continue;
      const uri = row["Letterboxd URI"]?.trim();
      switch (kind) {
        case "watched":
          e.watched = true;
          if (uri) e.letterboxdUri = uri;
          e.watchedAt ??= parseDate(row["Date"]);
          break;
        case "diary": {
          e.watched = true;
          const d = parseDate(row["Watched Date"]) ?? parseDate(row["Date"]);
          const rating = parseRating(row["Rating"]);
          if (d && (!e.watchedAt || d > e.watchedAt)) {
            e.watchedAt = d;
            if (rating != null) [e.rating, e.ratedAt] = [rating, d];
          } else if (e.rating == null && rating != null) {
            [e.rating, e.ratedAt] = [rating, d];
          }
          break;
        }
        case "reviews": {
          // Une ligne par critique : on garde la plus récente.
          const text = row["Review"]?.trim();
          if (!text) break;
          e.watched = true;
          const d = parseDate(row["Watched Date"]) ?? parseDate(row["Date"]);
          if (!e.review || (d && (!e.reviewedAt || d > e.reviewedAt))) {
            e.review = text.slice(0, 10_000);
            e.reviewedAt = d;
          }
          break;
        }
        case "ratings": {
          e.watched = true;
          // Note actuelle au moment de l'export : au moins aussi récente que celles du journal.
          const rating = parseRating(row["Rating"]);
          if (rating != null) {
            const d = parseDate(row["Date"]);
            e.rating = rating;
            e.ratedAt = d && e.ratedAt ? (d > e.ratedAt ? d : e.ratedAt) : (d ?? e.ratedAt);
          }
          if (uri) e.letterboxdUri ??= uri;
          break;
        }
        case "likes":
          // Aimer un film sur Letterboxd le marque aussi comme vu.
          e.liked = true;
          e.watched = true;
          break;
        case "watchlist":
          e.inWatchlist = true;
          if (uri) e.letterboxdUri ??= uri;
          break;
      }
    }
  }

  if (used.length === 0) {
    throw new AppError("CSV_INVALID", "noUsableFile", { unknown: unknown.slice(0, 5).join(", ") });
  }

  const entries = [...map.values()]
    .map((e) => ({ ...e, inWatchlist: e.inWatchlist && !e.watched }))
    .filter((e) => e.watched || e.inWatchlist);
  if (entries.length === 0) {
    throw new AppError("CSV_INVALID", "noFilms");
  }
  return { entries, used };
}
