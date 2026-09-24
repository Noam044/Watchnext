import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardActions } from "@/components/dashboard-actions";
import { FullImportReminder } from "@/components/full-import-reminder";
import { ArrowRightIcon } from "@/components/icons";
import { RecoProgramme, type RecoItem } from "@/components/reco-grid";
import { prisma } from "@/lib/db";
import { refs } from "@/lib/films";
import { needsFullImport } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "À voir" };
export const maxDuration = 60;

export default async function DashboardPage() {
  const user = await requireUser();
  const [watchedCount, libraryCount, recos, hiddenCount, profile, rssOnly] = await Promise.all([
    prisma.userFilm.count({ where: { userId: user.id, watched: true } }),
    prisma.userFilm.count({ where: { userId: user.id } }),
    prisma.recommendation.findMany({
      where: { userId: user.id, hidden: false },
      orderBy: { score: "desc" },
      include: { film: true },
    }),
    prisma.recommendation.count({ where: { userId: user.id, hidden: true } }),
    prisma.letterboxdProfile.findUnique({ where: { userId: user.id } }),
    needsFullImport(user.id),
  ]);

  if (libraryCount === 0) redirect("/import?welcome=1");

  const items: RecoItem[] = recos.map((r) => {
    const details = (r.details ?? {}) as { tags?: string[]; pct?: number };
    return {
      id: r.id,
      tmdbId: r.film.tmdbId,
      title: r.film.title,
      year: r.film.year,
      posterPath: r.film.posterPath,
      backdropPath: r.film.backdropPath,
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">À l&apos;affiche pour {user.name ?? `@${user.handle}`}</p>
          <p className="mt-1.5 text-sm text-dust-300">
            Sélection calculée à partir de tes {watchedCount.toLocaleString("fr-FR")} films vus.{" "}
            <Link href="/profile" className="inline-flex items-center gap-1 text-screen underline-offset-4 hover:underline">
              Voir mes goûts <ArrowRightIcon className="size-3.5" />
            </Link>
          </p>
        </div>
        <DashboardActions username={profile?.username ?? null} hiddenCount={hiddenCount} />
      </div>

      {rssOnly && <FullImportReminder filmCount={watchedCount} />}

      {items.length > 0 ? (
        <RecoProgramme items={items} />
      ) : (
        <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="marquee text-4xl">Aucune séance programmée</p>
          <p className="max-w-md text-sm text-dust-300">
            {watchedCount < 3
              ? "Il faut au moins 3 films vus pour cerner tes goûts. Importe ton historique complet."
              : "Clique sur « Recalculer » pour générer ta première sélection."}
          </p>
          {watchedCount < 3 && (
            <Link href="/import" className="btn-primary mt-2">
              Importer mon historique
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
