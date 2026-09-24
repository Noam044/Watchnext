import Link from "next/link";
import { snoozeExportReminderAction } from "@/actions/sync";
import { ArrowRightIcon, InfoIcon } from "@/components/icons";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

/**
 * Rappel d'import complet :
 * - « rss-only » tant que la bibliothèque ne vient que du flux RSS (50 dernières entrées de journal) ;
 * - « stale » quand le dernier export date de plus d'un mois : le flux ne rattrape ni la
 *   watchlist, ni les notes modifiées ou ajoutées sans entrée de journal.
 */
export function FullImportReminder(
  props: { kind: "rss-only"; filmCount: number } | { kind: "stale"; lastImportAt: Date },
) {
  return (
    <aside
      aria-label={props.kind === "rss-only" ? "Historique Letterboxd incomplet" : "Export Letterboxd à mettre à jour"}
      className="flex flex-col gap-4 rounded-2xl border border-tungsten/30 bg-tungsten-soft p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5"
    >
      <InfoIcon className="hidden size-5 shrink-0 text-tungsten sm:block" />
      {props.kind === "rss-only" ? (
        <p className="flex-1 text-sm leading-relaxed text-screen/90">
          <strong className="font-semibold text-screen">
            {props.filmCount.toLocaleString("fr-FR")} film{props.filmCount > 1 ? "s" : ""} importé
            {props.filmCount > 1 ? "s" : ""} depuis ton flux RSS.
          </strong>{" "}
          Letterboxd n&apos;y met que tes 50 dernières entrées de journal : importe ton export complet pour ajouter tout
          ton historique, tes likes et ta watchlist.
        </p>
      ) : (
        <p className="flex-1 text-sm leading-relaxed text-screen/90">
          <strong className="font-semibold text-screen">
            Ton dernier export date du {dateFmt.format(props.lastImportAt)}.
          </strong>{" "}
          Tes nouvelles entrées de journal arrivent toutes seules, mais pas ta watchlist ni les notes modifiées ou
          données sans entrée de journal : refais un export pour tout remettre à jour.
        </p>
      )}
      <div className="flex shrink-0 items-center gap-1 self-start sm:self-auto">
        {props.kind === "stale" && (
          <form action={snoozeExportReminderAction}>
            <button className="btn-quiet">Plus tard</button>
          </form>
        )}
        <Link href="/import?onglet=complet" className="btn-primary">
          Importer mon export <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>
    </aside>
  );
}
