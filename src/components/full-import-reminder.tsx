import Link from "next/link";
import { snoozeExportReminderAction } from "@/actions/sync";
import { ArrowRightIcon, InfoIcon } from "@/components/icons";
import { dateFormat } from "@/i18n/format";
import { getI18n } from "@/i18n/server";

/**
 * Rappel d'import complet :
 * - « rss-only » tant que la bibliothèque ne vient que du flux RSS (50 dernières entrées de journal) ;
 * - « stale » quand le dernier export date de plus d'un mois : le flux ne rattrape ni la
 *   watchlist, ni les notes modifiées ou ajoutées sans entrée de journal.
 */
export async function FullImportReminder(
  props: { kind: "rss-only"; filmCount: number } | { kind: "stale"; lastImportAt: Date },
) {
  const { t, locale } = await getI18n();
  const d = t.dashboard;
  return (
    <aside
      aria-label={props.kind === "rss-only" ? d.reminderRssLabel : d.reminderStaleLabel}
      className="flex flex-col gap-4 rounded-2xl border border-tungsten/30 bg-tungsten-soft p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5"
    >
      <InfoIcon className="hidden size-5 shrink-0 text-tungsten sm:block" />
      {props.kind === "rss-only" ? (
        <p className="flex-1 text-sm leading-relaxed text-screen/90">
          <strong className="font-semibold text-screen">{d.reminderRssStrong(props.filmCount)}</strong>{" "}
          {d.reminderRssText}
        </p>
      ) : (
        <p className="flex-1 text-sm leading-relaxed text-screen/90">
          <strong className="font-semibold text-screen">
            {d.reminderStaleStrong(dateFormat(locale, { day: "numeric", month: "long" }).format(props.lastImportAt))}
          </strong>{" "}
          {d.reminderStaleText}
        </p>
      )}
      <div className="flex shrink-0 items-center gap-1 self-start sm:self-auto">
        {props.kind === "stale" && (
          <form action={snoozeExportReminderAction}>
            <button className="btn-quiet">{t.common.later}</button>
          </form>
        )}
        <Link href="/import?onglet=complet" className="btn-primary">
          {d.importMyExport} <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>
    </aside>
  );
}
