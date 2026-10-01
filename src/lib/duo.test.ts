import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Film } from "@/generated/prisma/client";

type Entry = { filmId: string; watched: boolean; inWatchlist: boolean; rating: number | null; liked: boolean; film: Film };

const db = vi.hoisted(() => ({
  libraries: new Map<string, Entry[]>(),
  recos: [] as { userId: string; filmId: string; hidden: boolean }[],
  films: [] as Film[],
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    userFilm: {
      findMany: async ({ where }: { where: { userId: string } }) => db.libraries.get(where.userId) ?? [],
    },
    recommendation: {
      findMany: async ({ where }: { where: { userId: { in: string[] }; hidden: boolean } }) =>
        db.recos.filter((r) => where.userId.in.includes(r.userId) && r.hidden === where.hidden),
    },
    film: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        db.films.filter((f) => where.id.in.includes(f.id) && f.detailsFetchedAt),
    },
  },
}));
vi.mock("@/lib/tmdb", () => ({}));

const { getDuoPicks } = await import("@/lib/duo");

const horror = { id: 27, name: "Horreur" };
const comedy = { id: 35, name: "Comédie" };
const carpenter = { id: 1, name: "John Carpenter" };

let nextId = 1;
const film = (title: string, over: Partial<Film> = {}): Film => {
  const n = nextId++;
  const f = {
    id: `f${n}`,
    tmdbId: n,
    title,
    titleEn: null,
    year: 2010,
    genres: [],
    directors: [{ id: 1000 + n, name: `Réalisateur ${title}` }],
    cast: [],
    keywords: [],
    voteAverage: 7,
    voteCount: 5000,
    detailsFetchedAt: new Date(),
    ...over,
  } as unknown as Film;
  db.films.push(f);
  return f;
};

const seen = (f: Film, rating: number): Entry => ({ filmId: f.id, watched: true, inWatchlist: false, rating, liked: false, film: f });
const reco = (userId: string, f: Film, hidden = false) => db.recos.push({ userId, filmId: f.id, hidden });

beforeEach(() => {
  db.libraries.clear();
  db.recos.length = 0;
  db.films.length = 0;
});

/** Deux amis qui aiment l'horreur ; l'ami adore aussi les comédies, que « me » déteste. */
function twoHorrorFans() {
  const [h1, h2, h3, h4, h5] = ["H1", "H2", "H3", "H4", "H5"].map((t) => film(t, { genres: [horror] }));
  const [c1, c2, c3] = ["C1", "C2", "C3"].map((t) => film(t, { genres: [comedy] }));
  db.libraries.set("me", [seen(h1, 5), seen(h2, 5), seen(h3, 4.5), seen(c1, 1)]);
  db.libraries.set("friend", [seen(h4, 4.5), seen(h5, 4.5), seen(c2, 5), seen(c3, 5)]);
  return { myHorror: [h1, h2, h3], h1, h4 };
}

describe("getDuoPicks", () => {
  it("privilégie le film qui plaît aux deux plutôt que celui qu'un seul adore", async () => {
    twoHorrorFans();
    const sharedHorror = film("Horreur commune", { genres: [horror] });
    const friendComedy = film("Comédie de l'ami", { genres: [comedy], voteAverage: 8 });
    reco("me", sharedHorror);
    reco("friend", friendComedy);

    const picks = await getDuoPicks("me", "friend");
    expect(picks.map((p) => p.film.title)).toEqual(["Horreur commune", "Comédie de l'ami"]);

    const comedyPick = picks[1];
    expect(comedyPick.friendPct).toBeGreaterThan(comedyPick.mePct);
    // Score commun : 0,6 × le moins convaincu + 0,4 × la moyenne, donc plus près du plus bas.
    expect(comedyPick.pct).toBeLessThan((comedyPick.mePct + comedyPick.friendPct) / 2);
  });

  it("écarte les films déjà vus par l'un des deux, masqués ou sans détails", async () => {
    const { h1, h4 } = twoHorrorFans();
    const hidden = film("Masqué", { genres: [horror] });
    const undetailed = film("Sans détails", { genres: [horror], detailsFetchedAt: null });
    const fine = film("À voir", { genres: [horror] });
    reco("friend", h1);
    reco("me", h4);
    reco("me", undetailed);
    reco("me", fine);
    reco("friend", hidden, true);
    reco("me", hidden);

    expect((await getDuoPicks("me", "friend")).map((p) => p.film.title)).toEqual(["À voir"]);
  });

  it("garde au plus deux films par réalisateur", async () => {
    twoHorrorFans();
    for (const t of ["Carpenter 1", "Carpenter 2", "Carpenter 3"]) reco("me", film(t, { genres: [horror], directors: [carpenter] }));
    reco("me", film("Autre", { genres: [horror] }));

    const picks = await getDuoPicks("me", "friend");
    expect(picks.filter((p) => p.film.title.startsWith("Carpenter"))).toHaveLength(2);
    expect(picks).toHaveLength(3);
  });

  it("explique un choix par un film aimé proche, jamais par un simple genre commun", async () => {
    twoHorrorFans();
    const theThing = film("The Thing", { genres: [horror], directors: [carpenter] });
    db.libraries.get("me")!.push(seen(theThing, 5));
    reco("me", film("The Fog", { genres: [horror], directors: [carpenter] }));
    reco("me", film("Autre", { genres: [horror] }));

    const picks = await getDuoPicks("me", "friend");
    expect(picks.find((p) => p.film.title === "The Fog")?.meBecause?.title).toBe("The Thing");
    expect(picks.find((p) => p.film.title === "Autre")?.meBecause).toBeNull();
  });

  it("ne propose rien tant que l'un des deux a vu moins de 3 films", async () => {
    twoHorrorFans();
    db.libraries.set("friend", db.libraries.get("friend")!.slice(0, 2));
    reco("me", film("À voir", { genres: [horror] }));
    expect(await getDuoPicks("me", "friend")).toEqual([]);
  });

  it("signale les films de la watchlist de chacun", async () => {
    twoHorrorFans();
    const wanted = film("Dans la watchlist de l'ami", { genres: [horror] });
    db.libraries.get("friend")!.push({ filmId: wanted.id, watched: false, inWatchlist: true, rating: null, liked: false, film: wanted });

    const [pick] = await getDuoPicks("me", "friend");
    expect(pick).toMatchObject({ film: { title: "Dans la watchlist de l'ami" }, inFriendWatchlist: true, inMyWatchlist: false });
  });
});
