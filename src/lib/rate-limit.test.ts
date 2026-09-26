import { describe, expect, it, vi } from "vitest";

const hits: { key: string; createdAt: Date }[] = [];

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }) }));
vi.mock("@/lib/db", () => ({
  prisma: {
    rateLimitHit: {
      findMany: async ({ where, take }: { where: { key: string; createdAt: { gte: Date } }; take: number }) =>
        hits
          .filter((h) => h.key === where.key && h.createdAt >= where.createdAt.gte)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .slice(0, take),
      createMany: async ({ data }: { data: { key: string }[] }) => {
        for (const d of data) hits.push({ key: d.key, createdAt: new Date() });
      },
      deleteMany: async ({ where }: { where: { key: string } }) => {
        for (let i = hits.length - 1; i >= 0; i--) if (hits[i].key === where.key) hits.splice(i, 1);
      },
    },
  },
}));

const { LIMITS, MINUTE, clearHits, clientIp, recordHits, waitMinutes } = await import("@/lib/rate-limit");

describe("limite de tentatives", () => {
  it("lit l'adresse du visiteur dans x-forwarded-for", async () => {
    expect(await clientIp()).toBe("203.0.113.7");
  });

  it("bloque après 5 échecs sur un compte, pour le temps restant de la fenêtre", async () => {
    const limit = LIMITS.loginEmail("claire@example.com");
    for (let i = 0; i < 4; i++) await recordHits(limit);
    expect(await waitMinutes([limit])).toBe(0);
    await recordHits(limit);
    expect(await waitMinutes([limit])).toBe(15);
    await clearHits(limit);
    expect(await waitMinutes([limit])).toBe(0);
  });

  it("oublie les tentatives sorties de la fenêtre", async () => {
    const limit = LIMITS.registerIp("198.51.100.1");
    const old = new Date(Date.now() - 61 * MINUTE);
    for (let i = 0; i < 5; i++) hits.push({ key: limit.key, createdAt: old });
    expect(await waitMinutes([limit])).toBe(0);
  });
});
