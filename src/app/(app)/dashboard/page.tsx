import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardActions } from "@/components/dashboard-actions";
import { RecoGrid, type RecoItem } from "@/components/reco-grid";
import { prisma } from "@/lib/db";
import { refs } from "@/lib/films";
import { getProfileSummary } from "@/lib/stats";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Recommandations" };
export const maxDuration = 60;

export default async function DashboardPage() {
  const user = await requireUser();
  const [summary, recos, hiddenCount, profile] = await Promise.all([
    getProfileSummary(user.id),
    prisma.recommendation.findMany({
      where: { userId: user.id, hidden: false },
      orderBy: { score: "desc" },
      include: { film: true },
    }),
    prisma.recommendation.count({ where: { userId: user.id, hidden: true } }),
    prisma.letterboxdProfile.findUnique({ where: { userId: user.id } }),
  ]);

  if (summary.watchedCount === 0 && summary.watchlistCount === 0) redirect("/import?welcome=1");

  const items: RecoItem[] = recos.map((r) => {
    const details = (r.details ?? {}) as { tags?: string[]; pct?: number };
    return {
      id: r.id,
      tmdbId: r.film.tmdbId,
      title: r.film.title,
      year: r.film.year,
      posterPath: r.film.posterPath,
      overview: r.film.overview,
      genres: refs(r.film.genres).map((g) => g.name),
      directors: refs(r.film.directors).map((d) => d.name),
      voteAverage: r.film.voteAverage,
      runtime: r.film.runtime,
      reason: r.reason,
      tags: details.tags ?? [],
      pct: details.pct ?? 0,
    };
  });

  const maxDist = Math.max(1, ...summary.distribution.map((d) => d.count));

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div className="flex flex-col gap-1">
          <p className="label">{profile?.username ? `@${profile.username}` : "Ton profil"}</p>
          <h1 className="font-display text-4xl sm:text-5xl">
            {user.name ? `${user.name}, voici` : "Voici"} <span className="text-accent italic">ton profil</span>
          </h1>
        </div>

        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Films vus" value={summary.watchedCount.toLocaleString("fr-FR")} />
          <Stat
            label="Note moyenne"
            value={summary.averageRating ? `${summary.averageRating.toFixed(2).replace(".", ",")} ★` : "—"}
            hint={summary.ratedCount ? `sur ${summary.ratedCount} films notés` : "aucune note"}
          />
          <Stat label="Coups de cœur" value={summary.likedCount.toLocaleString("fr-FR")} hint="films likés" />
          <Stat label="Watchlist" value={summary.watchlistCount.toLocaleString("fr-FR")} hint="films à voir" />
        </dl>

        <div className="grid gap-3 md:grid-cols-3">
          <RankList title="Genres préférés" items={summary.topGenres.map((g) => ({ name: g.name, score: g.score }))} />
          <RankList
            title="Réalisateurs préférés"
            items={summary.topDirectors.map((d) => ({ name: d.name, score: d.score, sub: `${d.count} films` }))}
            empty="Pas encore assez de films notés."
          />
          <div className="card p-5">
            <h2 className="label">Répartition des notes</h2>
            {summary.ratedCount ? (
              <div className="mt-4 flex h-28 items-end gap-1" aria-label="Histogramme des notes">
                {summary.distribution.map((d) => (
                  <div key={d.rating} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-accent/80"
                      style={{ height: `${Math.max(2, (d.count / maxDist) * 96)}px` }}
                      title={`${d.rating} ★ : ${d.count} films`}
                    />
                    <span className="text-[10px] text-ink-400">{Number.isInteger(d.rating) ? d.rating : ""}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink-400">Aucune note importée.</p>
            )}
            {summary.topDecades[0] && (
              <p className="mt-3 text-xs text-ink-400">
                Décennie favorite : <span className="text-ink-300">{summary.topDecades[0].name}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl">À voir ensuite</h2>
            <p className="mt-1 text-sm text-ink-400">
              Classés selon ta proximité avec chaque film, sa note TMDB et les films que tu as aimés.
            </p>
          </div>
          <DashboardActions username={profile?.username ?? null} hiddenCount={hiddenCount} />
        </div>

        {items.length > 0 ? (
          <RecoGrid items={items} />
        ) : (
          <div className="card flex flex-col items-center gap-2 p-10 text-center">
            <p className="font-display text-2xl">Pas encore de recommandations</p>
            <p className="max-w-md text-sm text-ink-400">
              {summary.watchedCount < 3
                ? "Il faut au moins 3 films vus pour cerner tes goûts. Importe ton historique complet."
                : "Clique sur « Recalculer » pour générer ta première sélection."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4 sm:p-5">
      <dt className="label">{label}</dt>
      <dd className="mt-2 font-display text-3xl sm:text-4xl">{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-ink-400">{hint}</dd>}
    </div>
  );
}

function RankList({
  title,
  items,
  empty = "—",
}: {
  title: string;
  items: { name: string; score: number; sub?: string }[];
  empty?: string;
}) {
  return (
    <div className="card p-5">
      <h2 className="label">{title}</h2>
      {items.length ? (
        <ol className="mt-4 space-y-2.5">
          {items.map((it, i) => (
            <li key={it.name} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">
                  <span className="mr-2 text-ink-400 tabular-nums">{i + 1}</span>
                  {it.name}
                </span>
                {it.sub && <span className="shrink-0 text-xs text-ink-400">{it.sub}</span>}
              </div>
              <div className="h-1 rounded-full bg-ink-800">
                <div className="h-full rounded-full bg-accent/70" style={{ width: `${Math.round(it.score * 100)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-ink-400">{empty}</p>
      )}
    </div>
  );
}
