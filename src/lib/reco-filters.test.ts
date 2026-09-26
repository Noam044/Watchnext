import { describe, expect, it } from "vitest";
import { NO_FILTERS, isFiltered, matchesFilters, parseFilters, serializeFilters, type FilterableFilm } from "@/lib/reco-filters";

const film: FilterableFilm = {
  runtime: 101,
  year: 1994,
  language: "en",
  genres: ["Drame", "Crime"],
  inWatchlist: true,
  offers: { stream: [8, 119], rent: [2], buy: [] },
};

describe("matchesFilters", () => {
  it("laisse tout passer sans filtre", () => {
    expect(matchesFilters(film, NO_FILTERS, [])).toBe(true);
  });

  it("applique chaque critère", () => {
    const f = (patch: Partial<typeof NO_FILTERS>) => matchesFilters(film, { ...NO_FILTERS, ...patch }, [8]);
    expect(f({ mine: true })).toBe(true);
    expect(matchesFilters(film, { ...NO_FILTERS, mine: true }, [337])).toBe(false);
    expect(f({ runtime: 105 })).toBe(true);
    expect(f({ runtime: 90 })).toBe(false);
    expect(f({ decade: 1990 })).toBe(true);
    expect(f({ decade: 2000 })).toBe(false);
    expect(f({ lang: "en" })).toBe(true);
    expect(f({ lang: "fr" })).toBe(false);
    expect(f({ genre: "Crime" })).toBe(true);
    expect(f({ genre: "Comédie" })).toBe(false);
    expect(f({ watchlist: true })).toBe(true);
  });

  it("exclut un film sans durée connue d'un filtre de durée", () => {
    expect(matchesFilters({ ...film, runtime: null }, { ...NO_FILTERS, runtime: 120 }, [])).toBe(false);
  });
});

describe("parseFilters", () => {
  it("relit ce qui a été enregistré", () => {
    const f = { ...NO_FILTERS, mine: true, runtime: 120, decade: 1990, lang: "ko", genre: "Thriller", watchlist: true };
    expect(parseFilters(serializeFilters(f))).toEqual(f);
    expect(isFiltered(f)).toBe(true);
    expect(isFiltered(NO_FILTERS)).toBe(false);
  });

  it("ignore une valeur inattendue ou un cookie abîmé", () => {
    expect(parseFilters(encodeURIComponent(JSON.stringify({ runtime: 999, decade: "x", lang: "une langue trop longue" })))).toEqual(NO_FILTERS);
    expect(parseFilters("%7Bpas-du-json")).toEqual(NO_FILTERS);
    expect(parseFilters(undefined)).toEqual(NO_FILTERS);
  });
});
