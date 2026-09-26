import type { Metadata } from "next";
import { ImportPanel } from "@/components/import-panel";
import { Ticket, TicketFilm } from "@/components/ticket";
import { dateFormat, formatNumber } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { getImportHistory, getRecentDiary } from "@/lib/activity";
import { prisma } from "@/lib/db";
import { localizeFilms } from "@/lib/film-locale";
import { getUnmatched } from "@/lib/import";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.importPage.meta };
}
export const maxDuration = 60;

const STATUS_TONE = {
  PENDING: "text-dust-300",
  PROCESSING: "text-tungsten",
  DONE: "text-exit",
  FAILED: "text-bad",
} as const;

export default async function ImportPage({ searchParams }: PageProps<"/import">) {
  const { onglet } = await searchParams;
  const user = await requireUser();
  const [profile, filmCount, unmatched, history, diary, { t, locale }] = await Promise.all([
    prisma.letterboxdProfile.findUnique({ where: { userId: user.id } }),
    prisma.userFilm.count({ where: { userId: user.id } }),
    getUnmatched(user.id),
    getImportHistory(user.id),
    getRecentDiary(user.id, 4),
    getI18n(),
  ]);
  localizeFilms(diary, locale);
  const i = t.importPage;
  const dateFmt = dateFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const isOnboarding = filmCount === 0;
  const hasData = filmCount > 0 || history.length > 0;

  return (
    <div className={`grid gap-12 ${hasData ? "lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-14" : "mx-auto max-w-3xl"}`}>
      <div className="min-w-0 space-y-8">
        <header>
          <h1 className="marquee text-5xl sm:text-7xl">
            {isOnboarding ? (
              <>
                {i.connectYour} <span className="text-tungsten">Letterboxd</span>
              </>
            ) : (
              i.title
            )}
          </h1>
          <p className="mt-3 max-w-xl text-dust-300">{isOnboarding ? i.introOnboarding : i.intro}</p>
        </header>

        <ImportPanel defaultUsername={profile?.username} defaultTab={onglet === "complet" ? "full" : "quick"} />

        {diary.length > 0 && (
          <section aria-labelledby="journal" className="space-y-4">
            <div>
              <h2 id="journal" className="marquee text-3xl">
                {i.recentTitle}
              </h2>
              <p className="mt-1 text-sm text-dust-300">{i.recentText}</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {diary.map((d) => (
                <li key={d.id}>
                  <Ticket date={d.watchedAt} locale={locale} undated={t.common.undated}>
                    <TicketFilm
                      tmdbId={d.film.tmdbId}
                      title={d.film.title}
                      year={d.film.year}
                      posterPath={d.film.posterPath}
                      rating={d.rating}
                      liked={d.liked}
                      likedLabel={t.common.liked}
                    />
                  </Ticket>
                </li>
              ))}
            </ul>
          </section>
        )}

        {unmatched && unmatched.entries.length > 0 && (
          <section id="introuvables" className="scroll-mt-24 space-y-3">
            <h2 className="marquee text-3xl">{i.unmatchedTitle(unmatched.entries.length)}</h2>
            <p className="text-sm text-dust-400">{i.unmatchedText(dateFmt.format(unmatched.job.createdAt))}</p>
            <ul className="max-h-80 divide-y divide-velvet-800 overflow-y-auto rounded-lg border border-velvet-800">
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

      {hasData && (
        <aside className="space-y-10 lg:pt-3">
          <section aria-labelledby="bibliotheque">
            <h2 id="bibliotheque" className="marquee text-3xl">
              {i.libraryTitle}
            </h2>
            <dl className="mt-4 divide-y divide-velvet-800 border-y border-velvet-800 text-sm">
              <Fact label={i.libraryCount} value={formatNumber(filmCount, locale)} />
              <Fact label={i.lastRss} value={profile?.lastRssSync ? dateFmt.format(profile.lastRssSync) : i.never} />
              <Fact label={i.lastImport} value={profile?.lastImportAt ? dateFmt.format(profile.lastImportAt) : i.never} />
            </dl>
          </section>

          <section aria-labelledby="historique">
            <h2 id="historique" className="marquee text-3xl">
              {i.historyTitle}
            </h2>
            {history.length ? (
              <ol className="mt-4 space-y-4">
                {history.map((job) => (
                  <li key={job.id} className="border-l-2 border-velvet-700 pl-3.5">
                    <p className="flex items-baseline justify-between gap-2">
                      <span className="meta">{dateFmt.format(job.createdAt)}</span>
                      <span className={`font-mono text-[11px] ${STATUS_TONE[job.status]}`}>{i.jobStatus[job.status]}</span>
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold">{job.fileName ?? i.exportFile}</p>
                    <p className="text-sm text-dust-300">{i.historyMatched(job.matched, job.total)}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-dust-400">{i.historyEmpty}</p>
            )}
          </section>
        </aside>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-dust-300">{label}</dt>
      <dd className="text-right font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
