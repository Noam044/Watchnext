import type { Metadata } from "next";
import { ImportPanel } from "@/components/import-panel";
import { prisma } from "@/lib/db";
import { getUnmatched } from "@/lib/import";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Importer" };
export const maxDuration = 60;

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export default async function ImportPage({ searchParams }: PageProps<"/import">) {
  const { onglet } = await searchParams;
  const user = await requireUser();
  const [profile, filmCount, unmatched] = await Promise.all([
    prisma.letterboxdProfile.findUnique({ where: { userId: user.id } }),
    prisma.userFilm.count({ where: { userId: user.id } }),
    getUnmatched(user.id),
  ]);
  const isOnboarding = filmCount === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">{isOnboarding ? "Bienvenue" : "Données Letterboxd"}</p>
        <h1 className="marquee mt-1 text-5xl sm:text-7xl">
          {isOnboarding ? (
            <>
              Connecte ton <span className="text-tungsten">Letterboxd</span>
            </>
          ) : (
            "Importer et synchroniser"
          )}
        </h1>
        <p className="max-w-xl text-dust-300">
          {isOnboarding
            ? "Choisis comment récupérer ton historique. Tu pourras resynchroniser ou réimporter à tout moment : les films sont fusionnés sans doublons."
            : "Resynchronise ton flux RSS pour tes derniers visionnages, ou réimporte un export complet. Les films déjà connus sont fusionnés sans doublons."}
        </p>
      </header>

      <ImportPanel defaultUsername={profile?.username} defaultTab={onglet === "complet" ? "full" : "quick"} />

      {(profile?.lastRssSync || profile?.lastImportAt) && (
        <dl className="flex flex-wrap gap-x-10 gap-y-4 border-y border-velvet-800 py-5 text-sm">
          <div className="flex flex-col-reverse">
            <dt className="eyebrow mt-1">Films en bibliothèque</dt>
            <dd className="marquee text-3xl tabular-nums">{filmCount.toLocaleString("fr-FR")}</dd>
          </div>
          <div className="flex flex-col-reverse">
            <dt className="eyebrow mt-1">Dernière synchro RSS</dt>
            <dd className="pt-2 text-screen">{profile.lastRssSync ? dateFmt.format(profile.lastRssSync) : "Jamais"}</dd>
          </div>
          <div className="flex flex-col-reverse">
            <dt className="eyebrow mt-1">Dernier import complet</dt>
            <dd className="pt-2 text-screen">{profile.lastImportAt ? dateFmt.format(profile.lastImportAt) : "Jamais"}</dd>
          </div>
        </dl>
      )}

      {unmatched && unmatched.entries.length > 0 && (
        <section id="introuvables" className="card scroll-mt-24 p-5 sm:p-6">
          <h2 className="marquee text-3xl">
            {unmatched.entries.length} film{unmatched.entries.length > 1 ? "s" : ""} introuvable
            {unmatched.entries.length > 1 ? "s" : ""} sur TMDB
          </h2>
          <p className="mt-1 text-sm text-dust-400">
            Lors de l&apos;import du {dateFmt.format(unmatched.job.createdAt)}, ces titres n&apos;ont pas pu être associés à
            un film TMDB (titre différent, court-métrage, épisode de série…). Ils sont ignorés pour les recommandations.
          </p>
          <ul className="mt-4 max-h-80 divide-y divide-velvet-800 overflow-y-auto rounded-xl border border-velvet-800">
            {unmatched.entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="truncate">
                  {e.title} <span className="text-dust-400">{e.year ?? ""}</span>
                </span>
                {e.letterboxdUri && (
                  <a
                    href={e.letterboxdUri}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs text-dust-400 hover:text-tungsten"
                  >
                    Letterboxd ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
