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
  liked: boolean;
  watchedAt: Date | null;
};

type Kind = "watched" | "ratings" | "diary" | "watchlist" | "likes";
type Row = Record<string, string>;

export type ExportFile = { name: string; content: string };

const KNOWN: Record<string, Kind> = {
  "watched.csv": "watched",
  "ratings.csv": "ratings",
  "diary.csv": "diary",
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
    throw new AppError("CSV_INVALID", "L'archive .zip est illisible ou corrompue.");
  }
  return Object.entries(entries).map(([name, data]) => ({ name, content: strFromU8(data) }));
}

function kindOf(file: ExportFile, headers: string[]): Kind | null {
  // Chemin relatif à la racine de l'export (l'archive peut contenir un dossier parent).
  const path = file.name.replace(/\\/g, "/").toLowerCase();
  if (/(^|\/)(deleted|orphaned)\//.test(path)) return null;
  for (const [suffix, kind] of Object.entries(KNOWN)) {
    if (suffix.includes("/") ? path.endsWith(suffix) : path.split("/").pop() === suffix) return kind;
  }
  // Nom inattendu (fichier renommé) : on devine d'après les colonnes quand c'est possible.
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
    throw new AppError("CSV_INVALID", `Le fichier « ${file.name} » n'est pas un CSV valide (ligne ${(fatal.row ?? 0) + 2}).`);
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
      e = { title, year, letterboxdUri: null, watched: false, inWatchlist: false, rating: null, liked: false, watchedAt: null };
      map.set(key, e);
    }
    return e;
  };

  // Ordre de traitement : ratings.csv (note actuelle) après diary.csv (notes historiques).
  const order: Kind[] = ["watched", "diary", "ratings", "likes", "watchlist"];
  const parsed = files
    .map((file) => {
      const csv = parseCsv(file);
      return { file, ...csv, kind: kindOf(file, csv.headers) };
    })
    .filter((p) => {
      if (!p.kind && !/(^|\/)(deleted|orphaned)\//i.test(p.file.name)) unknown.push(p.file.name);
      return p.kind;
    })
    .sort((a, b) => order.indexOf(a.kind!) - order.indexOf(b.kind!));

  for (const { file, headers, rows, kind } of parsed) {
    if (!headers.includes("Name") || !headers.includes("Year")) {
      throw new AppError(
        "CSV_INVALID",
        `« ${file.name} » ne ressemble pas à un export Letterboxd (colonnes Name et Year manquantes).`,
      );
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
          if (d && (!e.watchedAt || d > e.watchedAt)) {
            e.watchedAt = d;
            e.rating = parseRating(row["Rating"]) ?? e.rating;
          } else {
            e.rating ??= parseRating(row["Rating"]);
          }
          break;
        }
        case "ratings":
          e.watched = true;
          e.rating = parseRating(row["Rating"]) ?? e.rating;
          if (uri) e.letterboxdUri ??= uri;
          break;
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
    const hint = unknown.length ? ` Fichiers non reconnus : ${unknown.slice(0, 5).join(", ")}.` : "";
    throw new AppError(
      "CSV_INVALID",
      `Aucun fichier exploitable trouvé. Envoie l'archive .zip de l'export ou au moins watched.csv, ratings.csv, diary.csv ou watchlist.csv.${hint}`,
    );
  }

  const entries = [...map.values()]
    .map((e) => ({ ...e, inWatchlist: e.inWatchlist && !e.watched }))
    .filter((e) => e.watched || e.inWatchlist);
  if (entries.length === 0) {
    throw new AppError("CSV_INVALID", "L'export ne contient aucun film.");
  }
  return { entries, used };
}
