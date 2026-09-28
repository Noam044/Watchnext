import "server-only";
import { prisma } from "@/lib/db";
import { buildProfile, filmWeight } from "@/lib/reco/profile";

export async function getProfileSummary(userId: string) {
  // Seulement les films vus, et seulement les champs du profil : une ligne Film complète (synopsis, offres,
  // mots-clés…) pèse 2 à 3 fois plus, sur toute la bibliothèque. Les mots-clés ne sont pas affichés ici et
  // chaque famille est normalisée à part : les omettre ne change pas les classements montrés.
  const [watched, watchlistCount] = await Promise.all([
    prisma.userFilm.findMany({
      where: { userId, watched: true },
      select: {
        rating: true,
        liked: true,
        film: { select: { genres: true, directors: true, cast: true, year: true } },
      },
    }),
    prisma.userFilm.count({ where: { userId, inWatchlist: true, watched: false } }),
  ]);
  const ratings = watched.filter((f) => f.rating != null).map((f) => f.rating!);
  const profile = buildProfile(watched.map((uf) => ({ film: { ...uf.film, keywords: [] }, weight: filmWeight(uf) })));

  const distribution = Array.from({ length: 10 }, (_, i) => ({
    rating: (i + 1) / 2,
    count: ratings.filter((r) => r === (i + 1) / 2).length,
  }));

  return {
    watchedCount: watched.length,
    watchlistCount,
    ratedCount: ratings.length,
    likedCount: watched.filter((f) => f.liked).length,
    averageRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    distribution,
    topGenres: profile.top.genre.slice(0, 5),
    topDirectors: profile.top.director.slice(0, 5),
    topActors: profile.top.cast.slice(0, 5),
    topDecades: profile.top.decade.slice(0, 3),
  };
}
