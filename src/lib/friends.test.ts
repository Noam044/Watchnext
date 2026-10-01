import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Friendship } from "@/generated/prisma/client";

const db = vi.hoisted(() => ({ queryRaw: vi.fn(), findMany: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: { $queryRaw: db.queryRaw, friendship: { findMany: db.findMany } },
}));

const { canViewLibrary, friendIds, relationFrom, tasteMatch, tasteMatches } = await import("@/lib/friends");

const friendship = (requesterId: string, addresseeId: string, status: "PENDING" | "ACCEPTED") =>
  ({ id: "fr1", requesterId, addresseeId, status }) as Friendship;

beforeEach(() => vi.clearAllMocks());

describe("relationFrom", () => {
  it("distingue soi-même, inconnu, ami et demandes dans chaque sens", () => {
    expect(relationFrom("me", "me", null)).toBe("self");
    expect(relationFrom("me", "bob", null)).toBe("none");
    expect(relationFrom("me", "bob", friendship("bob", "me", "ACCEPTED"))).toBe("friends");
    expect(relationFrom("me", "bob", friendship("me", "bob", "PENDING"))).toBe("outgoing");
    expect(relationFrom("me", "bob", friendship("bob", "me", "PENDING"))).toBe("incoming");
  });
});

describe("canViewLibrary", () => {
  it("réserve une bibliothèque privée à son propriétaire et à ses amis", () => {
    expect(canViewLibrary("self", false)).toBe(true);
    expect(canViewLibrary("friends", false)).toBe(true);
    expect(canViewLibrary("incoming", false)).toBe(false);
    expect(canViewLibrary("none", false)).toBe(false);
    expect(canViewLibrary("none", true)).toBe(true);
  });
});

describe("friendIds", () => {
  it("renvoie l'autre membre de chaque amitié, quel que soit l'auteur de la demande", async () => {
    db.findMany.mockResolvedValue([
      { requesterId: "me", addresseeId: "alice" },
      { requesterId: "bob", addresseeId: "me" },
    ]);
    expect(await friendIds("me")).toEqual(["alice", "bob"]);
  });
});

describe("tasteMatches", () => {
  const row = (otherId: string, ratedTogether: number, meanDiff: number | string | null) => ({
    otherId,
    common: ratedTogether + 2,
    bothLiked: 1,
    ratedTogether,
    meanDiff,
  });

  it("vaut 1 − écart moyen / 3, borné à 0, à partir de 5 films notés par les deux", async () => {
    db.queryRaw.mockResolvedValue([
      row("same", 12, 0),
      row("close", 8, 0.75),
      row("opposite", 20, 3.5),
      // Postgres renvoie AVG en décimal : Prisma peut le donner sous forme de texte.
      row("decimal", 6, "1.5"),
    ]);
    const res = await tasteMatches("me", ["same", "close", "opposite", "decimal"]);
    expect(res.get("same")?.pct).toBe(100);
    expect(res.get("close")?.pct).toBe(75);
    expect(res.get("opposite")?.pct).toBe(0);
    expect(res.get("decimal")?.pct).toBe(50);
  });

  it("ne donne pas de pourcentage sous 5 films notés en commun", async () => {
    db.queryRaw.mockResolvedValue([row("few", 4, 0)]);
    expect((await tasteMatches("me", ["few"])).get("few")).toMatchObject({ ratedTogether: 4, pct: null });
  });

  it("n'interroge pas la base sans autre membre, et renvoie un score vide sans film commun", async () => {
    expect((await tasteMatches("me", [])).size).toBe(0);
    expect(db.queryRaw).not.toHaveBeenCalled();

    db.queryRaw.mockResolvedValue([]);
    expect(await tasteMatch("me", "stranger")).toEqual({ common: 0, bothLiked: 0, ratedTogether: 0, pct: null });
  });
});
