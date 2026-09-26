import { describe, expect, it, vi } from "vitest";
import type { Film } from "@/generated/prisma/client";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/tmdb", () => ({}));

const { closestLiked, quality, toPct } = await import("@/lib/reco/engine");

const film = (id: number, over: Partial<Film> = {}): Film =>
  ({ id: `f${id}`, tmdbId: id, title: `Film ${id}`, year: 2000, genres: [], directors: [], cast: [], keywords: [], ...over }) as Film;

describe("toPct", () => {
  it("transforme un score en pourcentage croissant, borné entre 0 et 100", () => {
    expect(toPct(0.35)).toBe(50);
    expect(toPct(1)).toBeGreaterThan(95);
    expect(toPct(-0.5)).toBeLessThan(5);
    expect(toPct(0.6)).toBeGreaterThan(toPct(0.5));
  });
});

describe("quality", () => {
  it("tire les films peu votés vers la moyenne", () => {
    expect(quality({ voteAverage: 9, voteCount: 20000 })).toBeGreaterThan(quality({ voteAverage: 9, voteCount: 30 }));
    expect(quality({ voteAverage: 3, voteCount: 5000 })).toBe(0);
  });
});

describe("closestLiked", () => {
  const nolan = { id: 525, name: "Christopher Nolan" };
  const target = film(10, { directors: [nolan], genres: [{ id: 878, name: "Science-Fiction" }] });

  it("cite les films aimés les plus proches, jamais les films mal notés", () => {
    const liked = film(1, { title: "Inception", directors: [nolan] });
    const disliked = film(2, { title: "Tenet", directors: [nolan] });
    const unrelated = film(3, { title: "Amélie", genres: [{ id: 35, name: "Comédie" }] });
    const result = closestLiked(target, [
      { film: liked, weight: 1 },
      { film: disliked, weight: -0.8 },
      { film: unrelated, weight: 1 },
    ]);
    expect(result.map((f) => f.title)).toEqual(["Inception"]);
  });
});
