import type { Metadata } from "next";
import { ImportPanel } from "@/components/import-panel";
import { prisma } from "@/lib/db";
import { getUnmatched } from "@/lib/import";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Importer" };
export const maxDuration = 60;

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export default async function ImportPage() {
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
        <p className="label">{isOnboarding ? "Étape 1 sur 1" : "Données Letterboxd"}</p>
        <h1 className="font-display text-4xl sm:text-5xl">
          {isOnboarding ? (
            <>
              Connecte ton <span className="text-accent italic">Letterboxd</span>
            </>
          ) : (
            "Importer & synchroniser"
          )}
        </h1>
        <p className="max-w-xl text-ink-400">
          {isOnboarding
            ? "Choisis comment récupérer ton historique. Tu pourras resynchroniser ou réimporter à tout moment : les films sont fusionnés sans doublons."
            : "Resynchronise ton flux RSS pour tes derniers visionnages, ou réimporte un export complet. Les films déjà connus sont fusionnés sans doublons."}
        </p>
      </header>

      <ImportPanel defaultUsername={profile?.username} />

      {(profile?.lastRssSync || profile?.lastImportAt) && (
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="card p-4">
            <dt className="label">Films en bibliothèque</dt>
            <dd className="mt-1 text-lg">{filmCount}</dd>
          </div>
          <div className="card p-4">
            <dt className="label">Dernière synchro RSS</dt>
            <dd className="mt-1">{profile.lastRssSync ? dateFmt.format(profile.lastRssSync) : "—"}</dd>
          </div>
          <div className="card p-4">
            <dt className="label">Dernier import complet</dt>
            <dd className="mt-1">{profile.lastImportAt ? dateFmt.format(profile.lastImportAt) : "—"}</dd>
          </div>
        </dl>
      )}

      {unmatched && unmatched.entries.length > 0 && (
        <section id="introuvables" className="card scroll-mt-24 p-5 sm:p-6">
          <h2 className="font-display text-2xl">
            {unmatched.entries.length} film{unmatched.entries.length > 1 ? "s" : ""} introuvable
            {unmatched.entries.length > 1 ? "s" : ""} sur TMDB
          </h2>
          <p className="mt-1 text-sm text-ink-400">
            Lors de l&apos;import du {dateFmt.format(unmatched.job.createdAt)}, ces titres n&apos;ont pas pu être associés à
            un film TMDB (titre différent, court-métrage, épisode de série…). Ils sont ignorés pour les recommandations.
          </p>
          <ul className="mt-4 max-h-80 divide-y divide-ink-800 overflow-y-auto rounded-xl border border-ink-800">
            {unmatched.entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="truncate">
                  {e.title} <span className="text-ink-400">{e.year ?? ""}</span>
                </span>
                {e.letterboxdUri && (
                  <a
                    href={e.letterboxdUri}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs text-ink-400 hover:text-accent"
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
