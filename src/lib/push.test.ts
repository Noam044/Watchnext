import { beforeEach, describe, expect, it, vi } from "vitest";

const sent: { endpoint: string; payload: { title: string; body: string } }[] = [];
const deleted: string[] = [];

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(async (sub: { endpoint: string }, payload: string) => {
      if (sub.endpoint.endsWith("/expired")) throw Object.assign(new Error("Gone"), { statusCode: 410 });
      sent.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
    }),
  },
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    pushSubscription: {
      findMany: async () => [
        { id: "a", endpoint: "https://push.example/fr", p256dh: "k", auth: "a", locale: "fr" },
        { id: "b", endpoint: "https://push.example/en", p256dh: "k", auth: "a", locale: "en" },
        { id: "c", endpoint: "https://push.example/expired", p256dh: "k", auth: "a", locale: "fr" },
      ],
      delete: async ({ where }: { where: { id: string } }) => deleted.push(where.id),
    },
  },
}));

const { sendPush } = await import("@/lib/push");

describe("sendPush", () => {
  beforeEach(() => {
    sent.length = 0;
    deleted.length = 0;
  });

  it("ne fait rien sans clés VAPID", async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    await sendPush("u1", () => ({ title: "x", body: "y", url: "/" }));
    expect(sent).toHaveLength(0);
  });

  it("envoie à chaque appareil dans sa langue et oublie les abonnements expirés", async () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    await sendPush("u1", (locale) => ({ title: "Hugo", body: locale === "fr" ? "Salut" : "Hi", url: "/messages/hugo" }));
    expect(sent.map((s) => [s.endpoint, s.payload.body])).toEqual([
      ["https://push.example/fr", "Salut"],
      ["https://push.example/en", "Hi"],
    ]);
    expect(deleted).toEqual(["c"]);
  });
});
