import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserFilm } from "@/generated/prisma/client";
import type { IncomingFilm } from "@/lib/library";

const db = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    userFilm: { findUnique: db.findUnique, upsert: db.upsert },
    recommendation: { deleteMany: db.deleteMany },
  },
}));

const { mergeUserFilm } = await import("@/lib/library");

const day = (d: string) => new Date(`${d}T00:00:00Z`);

const existing = (over: Partial<UserFilm> = {}): UserFilm =>
  ({
    userId: "u1",
    filmId: "f1",
    watched: false,
    inWatchlist: false,
    rating: null,
    liked: false,
    watchedAt: null,
    review: null,
    reviewSpoilers: false,
    reviewedAt: null,
    ...over,
  }) as UserFilm;

const incoming = (over: Partial<IncomingFilm> = {}): IncomingFilm => ({
  watched: false,
  inWatchlist: false,
  rating: null,
  liked: false,
  watchedAt: null,
  ...over,
});

/** Données écrites par la fusion (champ `update` de l'upsert). */
const written = () => db.upsert.mock.calls[0][0].update;

beforeEach(() => {
  vi.clearAllMocks();
  db.upsert.mockImplementation(async ({ update }) => update);
});

describe("mergeUserFilm", () => {
  it("crée l'entrée d'un film inconnu", async () => {
    db.findUnique.mockResolvedValue(null);
    const { changed } = await mergeUserFilm("u1", "f1", incoming({ watched: true, rating: 4 }));
    expect(changed).toBe(true);
    expect(db.upsert.mock.calls[0][0].create).toMatchObject({ userId: "u1", filmId: "f1", watched: true, rating: 4 });
  });

  it("cumule « vu » et « aimé » : une entrée plus pauvre ne les efface pas", async () => {
    db.findUnique.mockResolvedValue(existing({ watched: true, liked: true, rating: 4.5 }));
    await mergeUserFilm("u1", "f1", incoming({ inWatchlist: true, review: "Toujours aussi bien." }));
    expect(written()).toMatchObject({ watched: true, inWatchlist: false, liked: true, rating: 4.5 });
  });

  it("retire de la watchlist et des recommandations un film qui vient d'être vu", async () => {
    db.findUnique.mockResolvedValue(existing({ inWatchlist: true }));
    await mergeUserFilm("u1", "f1", incoming({ watched: true }));
    expect(written()).toMatchObject({ watched: true, inWatchlist: false });
    expect(db.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1", filmId: "f1", hidden: false } });
  });

  it("garde la date de visionnage la plus récente", async () => {
    db.findUnique.mockResolvedValue(existing({ watched: true, watchedAt: day("2024-05-01") }));
    await mergeUserFilm("u1", "f1", incoming({ watched: true, rating: 3, watchedAt: day("2023-01-01") }));
    expect(written()).toMatchObject({ rating: 3, watchedAt: day("2024-05-01") });
  });

  it("garde la critique la plus récente", async () => {
    const old = existing({ watched: true, review: "Revu : chef-d'œuvre.", reviewedAt: day("2024-05-01") });

    db.findUnique.mockResolvedValue(old);
    await mergeUserFilm("u1", "f1", incoming({ watched: true, review: "Première vision.", reviewedAt: day("2020-01-01") }));
    expect(db.upsert).not.toHaveBeenCalled();

    db.findUnique.mockResolvedValue(old);
    await mergeUserFilm("u1", "f1", incoming({ watched: true, review: "Encore mieux.", reviewSpoilers: true, reviewedAt: day("2025-02-01") }));
    expect(written()).toMatchObject({ review: "Encore mieux.", reviewSpoilers: true, reviewedAt: day("2025-02-01") });
  });

  it("n'écrit rien quand l'entrée n'apporte rien de nouveau", async () => {
    const old = existing({ watched: true, rating: 4, watchedAt: day("2024-05-01") });
    db.findUnique.mockResolvedValue(old);
    const res = await mergeUserFilm("u1", "f1", incoming({ watched: true, rating: 4, watchedAt: day("2024-05-01") }));
    expect(res).toEqual({ userFilm: old, changed: false });
    expect(db.upsert).not.toHaveBeenCalled();
    expect(db.deleteMany).not.toHaveBeenCalled();
  });
});
