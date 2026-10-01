import { afterAll, describe, expect, it, vi } from "vitest";
import { refs } from "@/lib/films";
import { buildProfile, filmWeight } from "@/lib/reco/profile";
import { byTitle, PERSONAS, type Persona } from "./personas";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/tmdb", () => ({}));

const { diversify, explain, scoreCandidate, toPct } = await import("@/lib/reco/engine");

/**
 * Évaluation du classement : pour chaque profil type, le moteur note un lot de candidats
 * étiquetés à la main (bons / mauvais choix) avec les mêmes fonctions qu'en production.
 * Seuils : précision@5 ≥ 0,8 et aucun mauvais choix dans le top 5.
 */
const TOP = 5;
const MIN_PRECISION = 0.8;
/** Même seuil que la sélection des graines dans generateRecommendations. */
const SEED_MIN_WEIGHT = 0.45;

function rank(persona: Persona) {
  const rated = persona.library.map((w) => ({
    film: byTitle(w.title),
    weight: filmWeight({ rating: w.rating, liked: w.liked ?? false }),
  }));
  const profile = buildProfile(rated);
  const seedFilms = new Map(rated.map((r) => [r.film.tmdbId, r]));

  const scored = persona.pool.map((entry) => {
    const film = byTitle(entry.title);
    const seeds = new Map<number, number>();
    for (const title of entry.from ?? []) {
      const seed = seedFilms.get(byTitle(title).tmdbId);
      if (!seed) throw new Error(`${persona.name} : « ${title} » n'est pas dans la bibliothèque`);
      if (seed.weight >= SEED_MIN_WEIGHT) seeds.set(seed.film.tmdbId, seed.weight);
    }
    const support = [...seeds.values()].reduce((a, b) => a + b, 0);
    const inWatchlist = entry.inWatchlist ?? false;
    const { score } = scoreCandidate(profile, film, support, inWatchlist);
    const { reason, details } = explain(film, { seeds, inWatchlist }, profile, rated, seedFilms);
    return { film, score, reason, details };
  });

  return diversify(scored.sort((a, b) => b.score - a.score));
}

const summary: Record<string, { "précision@5": string; "mauvais top 5": number; top: string }> = {};

describe.each(PERSONAS)("$name", (persona) => {
  const ranking = rank(persona);
  const titles = ranking.map((r) => r.film.title);
  const top = titles.slice(0, TOP);
  const precision = top.filter((t) => persona.good.includes(t)).length / Math.min(TOP, persona.good.length);
  const badInTop = top.filter((t) => persona.bad.includes(t));
  summary[persona.name] = {
    "précision@5": precision.toFixed(2),
    "mauvais top 5": badInTop.length,
    top: ranking
      .slice(0, TOP)
      .map((r) => `${r.film.title} (${toPct(r.score)} %)`)
      .join(", "),
  };

  const known = (check: "precision" | "bad") => persona.knownIssues?.find((k) => k.check === check);
  const check = (name: "precision" | "bad", label: string, fn: () => void) => {
    const issue = known(name);
    if (issue) it.fails(`${label} [défaut connu : ${issue.why}]`, fn);
    else it(label, fn);
  };

  check("precision", `met les bons choix en tête (précision@5 ≥ ${MIN_PRECISION})`, () => {
    expect(precision, `top 5 : ${top.join(", ")}`).toBeGreaterThanOrEqual(MIN_PRECISION);
  });

  check("bad", "ne propose aucun mauvais choix dans le top 5", () => {
    expect(badInTop).toEqual([]);
  });

  it.each(persona.above ?? [])("classe « %s » avant « %s »", (a, b) => {
    expect(titles.indexOf(a), titles.join(", ")).toBeLessThan(titles.indexOf(b));
  });

  it("garde au plus 3 films par réalisateur", () => {
    const perDirector = new Map<number, number>();
    for (const r of ranking) {
      const d = refs(r.film.directors)[0];
      if (d) perDirector.set(d.id, (perDirector.get(d.id) ?? 0) + 1);
    }
    expect(Math.max(0, ...perDirector.values())).toBeLessThanOrEqual(3);
  });

  it.each(Object.entries(persona.because ?? {}))("explique « %s » par les bons films aimés", (title, expected) => {
    const r = ranking.find((x) => x.film.title === title)!;
    expect(r.details.because, r.reason).toEqual(expect.arrayContaining(expected));
  });

  it.each(Object.entries(persona.tags ?? {}))("étiquette « %s »", (title, expected) => {
    const r = ranking.find((x) => x.film.title === title)!;
    expect(r.details.tags).toEqual(expect.arrayContaining(expected));
  });
});

afterAll(() => {
  console.table(summary);
});
