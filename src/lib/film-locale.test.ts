import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tmdb", () => ({ language: () => "fr-FR" }));
vi.mock("@/lib/db", () => ({
  prisma: {
    film: {
      findMany: async () => [
        { tmdbId: 278, title: "Les Évadés", titleEn: "The Shawshank Redemption" },
        { tmdbId: 238, title: "Le Parrain", titleEn: null },
      ],
    },
  },
}));
vi.mock("@/lib/films", () => ({
  ensureManyDetails: async () => new Map([[238, { tmdbId: 238, titleEn: "The Godfather" }]]),
}));

const { becauseTitles, localizeFilms } = await import("@/lib/film-locale");

describe("localizeFilms", () => {
  const data = () => ({
    reco: { film: { title: "Les Affranchis", titleEn: "GoodFellas", overview: "Brooklyn…", overviewEn: "Henry Hill…" } },
    list: [{ film: { title: "Oldboy", titleEn: null } }],
    map: new Map([[1, { title: "Le Parrain", titleEn: "The Godfather" }]]),
    date: new Date(0),
  });

  it("ne touche à rien en français", () => {
    expect(localizeFilms(data(), "fr").reco.film.title).toBe("Les Affranchis");
  });

  it("prend les titres et synopsis anglais partout, sauf s'ils manquent", () => {
    const d = localizeFilms(data(), "en");
    expect(d.reco.film).toMatchObject({ title: "GoodFellas", overview: "Henry Hill…" });
    expect(d.list[0].film.title).toBe("Oldboy");
    expect(d.map.get(1)?.title).toBe("The Godfather");
    expect(d.date).toBeInstanceOf(Date);
  });
});

describe("becauseTitles", () => {
  it("traduit les films cités, en récupérant ceux sans titre anglais", async () => {
    const titles = await becauseTitles([{ because: ["Les Évadés", "Le Parrain"], becauseIds: [278, 238] }], "en");
    expect(titles({ because: ["Les Évadés", "Le Parrain"], becauseIds: [278, 238] })).toEqual([
      "The Shawshank Redemption",
      "The Godfather",
    ]);
    // Recommandation calculée avant l'ajout des identifiants : titres d'origine.
    expect(titles({ because: ["Les Évadés"] })).toEqual(["Les Évadés"]);
  });
});
