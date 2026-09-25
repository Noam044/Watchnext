import type { Metadata } from "next";
import { ImportPanel } from "@/components/import-panel";
import { dateFormat, formatNumber } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { getUnmatched } from "@/lib/import";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.importPage.meta };
}
export const maxDuration = 60;

export default async function ImportPage({ searchParams }: PageProps<"/import">) {
  const { onglet } = await searchParams;
  const user = await requireUser();
  const [profile, filmCount, unmatched, { t, locale }] = await Promise.all([
    prisma.letterboxdProfile.findUnique({ where: { userId: user.id } }),
    prisma.userFilm.count({ where: { userId: user.id } }),
    getUnmatched(user.id),
    getI18n(),
  ]);
  const i = t.importPage;
  const dateFmt = dateFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const isOnboarding = filmCount === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">{isOnboarding ? i.welcome : i.dataEyebrow}</p>
        <h1 className="marquee mt-1 text-5xl sm:text-7xl">
          {isOnboarding ? (
            <>
              {i.connectYour} <span className="text-tungsten">Letterboxd</span>
            </>
          ) : (
            i.title
          )}
        </h1>
        <p className="max-w-xl text-dust-300">
          {isOnboarding ? i.introOnboarding : i.intro}
        </p>
      </header>

      <ImportPanel defaultUsername={profile?.username} defaultTab={onglet === "complet" ? "full" : "quick"} />

      {(profile?.lastRssSync || profile?.lastImportAt) && (
        <dl className="flex flex-wrap gap-x-10 gap-y-4 border-y border-velvet-800 py-5 text-sm">
          <div className="flex flex-col-reverse">
            <dt className="eyebrow mt-1">{i.libraryCount}</dt>
            <dd className="marquee text-3xl tabular-nums">{formatNumber(filmCount, locale)}</dd>
          </div>
          <div className="flex flex-col-reverse">
            <dt className="eyebrow mt-1">{i.lastRss}</dt>
            <dd className="pt-2 text-screen">{profile.lastRssSync ? dateFmt.format(profile.lastRssSync) : i.never}</dd>
          </div>
          <div className="flex flex-col-reverse">
            <dt className="eyebrow mt-1">{i.lastImport}</dt>
            <dd className="pt-2 text-screen">{profile.lastImportAt ? dateFmt.format(profile.lastImportAt) : i.never}</dd>
          </div>
        </dl>
      )}

      {unmatched && unmatched.entries.length > 0 && (
        <section id="introuvables" className="card scroll-mt-24 p-5 sm:p-6">
          <h2 className="marquee text-3xl">
            {i.unmatchedTitle(unmatched.entries.length)}
          </h2>
          <p className="mt-1 text-sm text-dust-400">
            {i.unmatchedText(dateFmt.format(unmatched.job.createdAt))}
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
