import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tmdb", () => ({
  getGenreMap: async (lang: string) =>
    new Map(
      lang === "en-US"
        ? [
            [18, "Drama"],
            [80, "Crime"],
            [16, "Animation"],
          ]
        : [
            [18, "Drame"],
            [80, "Crime"],
            [16, "Animation"],
          ],
    ),
}));

const { getLocalizer } = await import("@/lib/localize");

describe("getLocalizer", () => {
  it("laisse le français tel quel", async () => {
    const fr = await getLocalizer("fr");
    expect(fr.reco("Parce que tu as aimé Les Évadés", ["Avec Tom Hanks"])).toEqual({
      reason: "Parce que tu as aimé Les Évadés",
      tags: ["Avec Tom Hanks"],
    });
    expect(fr.decade(1990)).toBe("Années 1990");
  });

  it("traduit genres, décennies, raisons et étiquettes en anglais", async () => {
    const en = await getLocalizer("en");
    expect(en.genre({ id: 18, name: "Drame" })).toBe("Drama");
    expect(en.decade(1990)).toBe("1990s");
    expect(en.reco("Parce que tu as aimé Les Évadés et Le Parrain", [], ["The Shawshank Redemption", "The Godfather"]).reason).toBe(
      "Because you liked The Shawshank Redemption and The Godfather",
    );
    expect(en.reco("Parce que tu apprécies les films de Martin Scorsese", []).reason).toBe(
      "Because you enjoy films by Martin Scorsese",
    );
    expect(en.reco("Correspond à ton goût pour drame et crime", []).reason).toBe("Matches your taste for drama and crime");
    expect(en.reco("x", ["Réalisé par David Fincher", "Avec Brad Pitt", "Dans ta watchlist", "Drame · Crime"]).tags).toEqual([
      "Directed by David Fincher",
      "Starring Brad Pitt",
      "On your watchlist",
      "Drama · Crime",
    ]);
  });
});
