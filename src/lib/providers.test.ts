import { describe, expect, it } from "vitest";
import { distinctProviders, isWatchRegion, offersFor, onMyPlatforms } from "@/lib/providers";

describe("offres de streaming", () => {
  const stored = { FR: { link: "https://tmdb/fr", stream: [8], rent: [2], buy: [2, 3] } };

  it("distingue offres inconnues (null) et absence d'offre dans le pays", () => {
    expect(offersFor(null, "FR")).toBeNull();
    expect(offersFor(stored, "FR")).toEqual(stored.FR);
    expect(offersFor(stored, "BE")).toEqual({ stream: [], rent: [], buy: [] });
  });

  it("repère un film inclus dans un abonnement", () => {
    expect(onMyPlatforms(stored.FR, [8, 337])).toBe(true);
    expect(onMyPlatforms(stored.FR, [2])).toBe(false);
    expect(onMyPlatforms(null, [8])).toBe(false);
  });

  it("regroupe une plateforme et sa formule avec publicité", () => {
    const prime = { id: 119, name: "Amazon Prime Video" };
    const primeAds = { id: 2100, name: "Amazon Prime Video with Ads" };
    const netflixAds = { id: 1796, name: "Netflix Standard with Ads" };
    const netflix = { id: 8, name: "Netflix" };
    expect(distinctProviders([prime, primeAds, netflix])).toEqual([prime, netflix]);
    // La première gardée : celle de l'abonnement, placée en tête par l'appelant.
    expect(distinctProviders([netflixAds, netflix, primeAds])).toEqual([netflixAds, primeAds]);
  });

  it("n'accepte que les pays proposés", () => {
    expect(isWatchRegion("FR")).toBe(true);
    expect(isWatchRegion("XX")).toBe(false);
  });
});
