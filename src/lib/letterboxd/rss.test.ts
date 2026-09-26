import { describe, expect, it } from "vitest";
import { normalizeUsername, parseReview, parseRss } from "@/lib/letterboxd/rss";

const item = (fields: Record<string, string>) =>
  `<item>${Object.entries(fields)
    .map(([k, v]) => `<${k}>${v}</${k}>`)
    .join("")}</item>`;

const feed = (...items: string[]) =>
  `<?xml version="1.0" encoding="utf-8"?><rss version="2.0" xmlns:letterboxd="https://letterboxd.com" xmlns:tmdb="https://themoviedb.org"><channel><title>Letterboxd</title>${items.join("")}</channel></rss>`;

const poster = `<p><img src="https://a.ltrbxd.com/poster.jpg"/></p>`;

describe("normalizeUsername", () => {
  it("accepte un pseudo, un @pseudo ou l'URL du profil", () => {
    expect(normalizeUsername("claire_demo")).toBe("claire_demo");
    expect(normalizeUsername("  @claire_demo ")).toBe("claire_demo");
    expect(normalizeUsername("https://letterboxd.com/claire_demo/films/")).toBe("claire_demo");
  });

  it("refuse un pseudo invalide", () => {
    expect(() => normalizeUsername("claire demo")).toThrow();
    expect(() => normalizeUsername("")).toThrow();
  });
});

describe("parseReview", () => {
  it("ignore l'affiche et la ligne de journal seule", () => {
    expect(parseReview(`${poster}<p>Watched on Sunday September 14, 2025.</p>`)).toEqual({ review: null, spoilers: false });
  });

  it("garde les paragraphes, décode les entités et repère l'avertissement de spoiler", () => {
    const html = `${poster}<p>This review may contain spoilers.</p><p>Un film &amp; une claque.<br/>Revu deux fois.</p><p>&#8220;Magnifique&#8221;</p>`;
    expect(parseReview(html)).toEqual({
      review: "Un film & une claque.\nRevu deux fois.\n\n“Magnifique”",
      spoilers: true,
    });
  });
});

describe("parseRss", () => {
  it("lit les entrées de journal (note, like, date, revisionnage, critique)", () => {
    const xml = feed(
      item({
        title: "Fight Club, 1999 - ★★★★½",
        "tmdb:movieId": "550",
        "letterboxd:filmTitle": "Fight Club",
        "letterboxd:filmYear": "1999",
        "letterboxd:memberRating": "4.5",
        "letterboxd:memberLike": "Yes",
        "letterboxd:rewatch": "No",
        "letterboxd:watchedDate": "2025-10-14",
        description: `<![CDATA[${poster}<p>Culte.</p>]]>`,
      }),
    );
    const [entry] = parseRss(xml);
    expect(entry).toMatchObject({
      tmdbId: 550,
      title: "Fight Club",
      year: 1999,
      rating: 4.5,
      liked: true,
      rewatch: false,
      review: "Culte.",
      reviewSpoilers: false,
    });
    expect(entry.watchedAt?.toISOString()).toBe("2025-10-14T12:00:00.000Z");
  });

  it("ignore les listes et fusionne les revisionnages en gardant l'entrée la plus récente", () => {
    const xml = feed(
      item({ title: "Ma liste", description: "<p>Une liste</p>" }),
      item({
        title: "Oldboy, 2003",
        "tmdb:movieId": "670",
        "letterboxd:filmTitle": "Oldboy",
        "letterboxd:filmYear": "2003",
        "letterboxd:memberLike": "No",
        "letterboxd:watchedDate": "2026-01-02",
        description: `<![CDATA[${poster}<p>Watched on Friday January 2, 2026.</p>]]>`,
      }),
      item({
        title: "Oldboy, 2003 - ★★★★ (contains spoilers)",
        "tmdb:movieId": "670",
        "letterboxd:filmTitle": "Oldboy",
        "letterboxd:filmYear": "2003",
        "letterboxd:memberRating": "4.0",
        "letterboxd:memberLike": "Yes",
        "letterboxd:watchedDate": "2024-05-01",
        description: `<![CDATA[${poster}<p>La scène du couloir.</p>]]>`,
      }),
    );
    const entries = parseRss(xml);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ tmdbId: 670, rating: 4, liked: true, review: "La scène du couloir.", reviewSpoilers: true });
    expect(entries[0].watchedAt?.toISOString().slice(0, 10)).toBe("2026-01-02");
  });

  it("refuse un document qui n'est pas un flux RSS", () => {
    expect(() => parseRss("<html><body>Not found</body></html>")).toThrow();
  });
});
