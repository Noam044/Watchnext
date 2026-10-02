import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { filesFromZip, parseLetterboxdExport } from "@/lib/letterboxd/export";

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => (c.includes(",") ? `"${c}"` : c)).join(",")).join("\n");

describe("parseLetterboxdExport", () => {
  it("fusionne les fichiers d'un export en une entrée par film", () => {
    const { entries, used } = parseLetterboxdExport([
      {
        name: "watched.csv",
        content: csv([
          ["Date", "Name", "Year", "Letterboxd URI"],
          ["2024-01-01", "Fight Club", "1999", "https://boxd.it/a"],
          ["2024-02-01", "Oldboy", "2003", "https://boxd.it/b"],
        ]),
      },
      {
        name: "diary.csv",
        content: csv([
          ["Date", "Name", "Year", "Letterboxd URI", "Rating", "Rewatch", "Tags", "Watched Date"],
          ["2024-03-02", "Fight Club", "1999", "https://boxd.it/c", "3", "", "", "2024-03-01"],
          ["2025-06-02", "Fight Club", "1999", "https://boxd.it/d", "4", "Yes", "", "2025-06-01"],
        ]),
      },
      {
        name: "ratings.csv",
        content: csv([
          ["Date", "Name", "Year", "Letterboxd URI", "Rating"],
          ["2025-06-02", "Fight Club", "1999", "https://boxd.it/a", "4.5"],
        ]),
      },
      { name: "likes/films.csv", content: csv([["Date", "Name", "Year", "Letterboxd URI"], ["2024-02-02", "Oldboy", "2003", "https://boxd.it/b"]]) },
      {
        name: "watchlist.csv",
        content: csv([
          ["Date", "Name", "Year", "Letterboxd URI"],
          ["2024-01-01", "Paprika", "2006", "https://boxd.it/e"],
          ["2024-01-01", "Oldboy", "2003", "https://boxd.it/b"],
        ]),
      },
      { name: "deleted/diary.csv", content: csv([["Date", "Name", "Year"], ["2020-01-01", "Supprimé", "2000"]]) },
    ]);

    expect(used).toEqual(["watched.csv", "diary.csv", "ratings.csv", "likes/films.csv", "watchlist.csv"]);
    const byTitle = Object.fromEntries(entries.map((e) => [e.title, e]));
    // ratings.csv (note actuelle) l'emporte sur le journal ; la date la plus récente du journal est gardée.
    expect(byTitle["Fight Club"]).toMatchObject({ watched: true, rating: 4.5, letterboxdUri: "https://boxd.it/a" });
    expect(byTitle["Fight Club"].watchedAt?.toISOString().slice(0, 10)).toBe("2025-06-01");
    // La note de ratings.csv est datée par sa propre colonne Date, plus récente que le journal.
    expect(byTitle["Fight Club"].ratedAt?.toISOString().slice(0, 10)).toBe("2025-06-02");
    // Un film vu sort de la watchlist ; un like vaut visionnage.
    expect(byTitle["Oldboy"]).toMatchObject({ watched: true, liked: true, inWatchlist: false });
    expect(byTitle["Paprika"]).toMatchObject({ watched: false, inWatchlist: true });
    expect(byTitle["Supprimé"]).toBeUndefined();
  });

  it("garde la critique la plus récente", () => {
    const { entries } = parseLetterboxdExport([
      {
        name: "reviews.csv",
        content: csv([
          ["Date", "Name", "Year", "Letterboxd URI", "Rating", "Rewatch", "Review", "Tags", "Watched Date"],
          ["2024-01-01", "Oldboy", "2003", "u", "4", "", "Ancienne critique", "", "2024-01-01"],
          ["2025-01-01", "Oldboy", "2003", "u", "5", "", "Nouvelle critique", "", "2025-01-01"],
        ]),
      },
    ]);
    expect(entries[0].review).toBe("Nouvelle critique");
  });

  it("ignore les CSV des sous-dossiers likes/ et lists/ qui partagent un nom racine", () => {
    const { entries, used } = parseLetterboxdExport([
      {
        name: "export/reviews.csv",
        content: csv([
          ["Date", "Name", "Year", "Letterboxd URI", "Rating", "Rewatch", "Review", "Tags", "Watched Date"],
          ["2024-01-01", "Oldboy", "2003", "u", "4", "", "Ma critique", "", "2024-01-01"],
        ]),
      },
      { name: "export/likes/reviews.csv", content: csv([["Date", "Content"], ["2024-02-01", "https://boxd.it/x"]]) },
      { name: "export/likes/lists.csv", content: csv([["Date", "Content"], ["2024-02-01", "https://boxd.it/y"]]) },
      {
        name: "export/lists/watchlist.csv",
        content: "Letterboxd list export v7\nDate,Name,Tags,URL,Description\n2024-01-01,Ma liste,,u,",
      },
    ]);
    expect(used).toEqual(["export/reviews.csv"]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ title: "Oldboy", review: "Ma critique" });
  });

  it("refuse un CSV qui ne vient pas de Letterboxd", () => {
    expect(() => parseLetterboxdExport([{ name: "notes.csv", content: "a,b\n1,2" }])).toThrow();
    expect(() => parseLetterboxdExport([{ name: "ratings.csv", content: "Titre,Note\nX,3" }])).toThrow();
  });
});

describe("filesFromZip", () => {
  it("ne garde que les CSV de l'archive", () => {
    const zip = zipSync({
      "letterboxd-export/ratings.csv": strToU8("Date,Name,Year\n"),
      "letterboxd-export/profile.jpg": strToU8("binary"),
    });
    expect(filesFromZip(zip).map((f) => f.name)).toEqual(["letterboxd-export/ratings.csv"]);
  });

  it("refuse un fichier qui n'est pas une archive zip", () => {
    expect(() => filesFromZip(strToU8("pas un zip"))).toThrow();
  });
});
