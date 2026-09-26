import { describe, expect, it } from "vitest";
import type { Film } from "@/generated/prisma/client";
import { buildProfile, filmFeatures, filmWeight, profileSimilarity } from "@/lib/reco/profile";

const film = (id: number, over: Partial<Film>): Film =>
  ({
    id: `f${id}`,
    tmdbId: id,
    title: `Film ${id}`,
    year: 2000,
    genres: [],
    directors: [],
    cast: [],
    keywords: [],
    ...over,
  }) as Film;

const thriller = { id: 53, name: "Thriller" };
const comedy = { id: 35, name: "Comédie" };
const fincher = { id: 7467, name: "David Fincher" };

describe("filmWeight", () => {
  it("transforme la note en poids, un like en bonus", () => {
    expect(filmWeight({ rating: 5, liked: false })).toBeCloseTo(1);
    expect(filmWeight({ rating: 0.5, liked: false })).toBeCloseTo(-1);
    expect(filmWeight({ rating: 5, liked: true })).toBeCloseTo(1.35);
    expect(filmWeight({ rating: null, liked: false })).toBeCloseTo(0.12);
    expect(filmWeight({ rating: null, liked: true })).toBeCloseTo(0.8);
  });
});

describe("filmFeatures", () => {
  it("décrit un film par genres, réalisateurs, acteurs principaux, mots-clés et décennie", () => {
    const f = filmFeatures(
      film(1, { genres: [thriller], directors: [fincher], cast: Array.from({ length: 8 }, (_, i) => ({ id: i, name: `A${i}` })), year: 1999 }),
    );
    expect(f.filter((x) => x.type === "cast")).toHaveLength(5);
    expect(f).toContainEqual({ type: "decade", id: 1990, name: "Années 1990" });
    expect(f).toContainEqual({ type: "director", ...fincher });
  });
});

describe("buildProfile / profileSimilarity", () => {
  const profile = buildProfile([
    { film: film(1, { genres: [thriller], directors: [fincher] }), weight: 1 },
    { film: film(2, { genres: [thriller], directors: [fincher] }), weight: 0.9 },
    { film: film(3, { genres: [comedy] }), weight: -1 },
  ]);

  it("retient ce qui est aimé et ce qui est rejeté", () => {
    expect(profile.affinity.get("genre:53")).toBeGreaterThan(0);
    expect(profile.affinity.get("genre:35")).toBeLessThan(0);
    expect(profile.top.director[0]).toMatchObject({ id: fincher.id, count: 2 });
  });

  it("rapproche un thriller de Fincher, éloigne une comédie", () => {
    const close = profileSimilarity(profile, filmFeatures(film(4, { genres: [thriller], directors: [fincher] }))).score;
    const far = profileSimilarity(profile, filmFeatures(film(5, { genres: [comedy] }))).score;
    expect(close).toBeGreaterThan(0.5);
    expect(far).toBeLessThan(0);
  });
});
