import "server-only";
import { prisma } from "@/lib/db";
import { buildProfile, filmWeight } from "@/lib/reco/profile";

export async function getProfileSummary(userId: string) {
  const films = await prisma.userFilm.findMany({ where: { userId }, include: { film: true } });
  const watched = films.filter((f) => f.watched);
  const ratings = watched.filter((f) => f.rating != null).map((f) => f.rating!);
  const profile = buildProfile(watched.map((uf) => ({ film: uf.film, weight: filmWeight(uf) })));

  const distribution = Array.from({ length: 10 }, (_, i) => ({
    rating: (i + 1) / 2,
    count: ratings.filter((r) => r === (i + 1) / 2).length,
  }));

  return {
    watchedCount: watched.length,
    watchlistCount: films.filter((f) => f.inWatchlist && !f.watched).length,
    ratedCount: ratings.length,
    likedCount: watched.filter((f) => f.liked).length,
    averageRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    distribution,
    topGenres: profile.top.genre.slice(0, 5),
    topDirectors: profile.top.director.slice(0, 5),
    topActors: profile.top.cast.slice(0, 5),
    topDecades: profile.top.decade.slice(0, 3),
    missingDetails: watched.filter((f) => !f.film.detailsFetchedAt).length,
  };
}
