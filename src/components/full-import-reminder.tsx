import Link from "next/link";
import { ArrowRightIcon, InfoIcon } from "@/components/icons";

/**
 * Rappel affiché tant que la bibliothèque ne vient que du flux RSS : Letterboxd
 * n'y met que les 50 dernières entrées du journal, sans likes anciens ni watchlist.
 */
export function FullImportReminder({ filmCount }: { filmCount: number }) {
  return (
    <aside
      aria-label="Historique Letterboxd incomplet"
      className="flex flex-col gap-4 rounded-2xl border border-tungsten/30 bg-tungsten-soft p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5"
    >
      <InfoIcon className="hidden size-5 shrink-0 text-tungsten sm:block" />
      <p className="flex-1 text-sm leading-relaxed text-screen/90">
        <strong className="font-semibold text-screen">
          {filmCount.toLocaleString("fr-FR")} film{filmCount > 1 ? "s" : ""} importé{filmCount > 1 ? "s" : ""} depuis ton flux
          RSS.
        </strong>{" "}
        Letterboxd n&apos;y met que tes 50 dernières entrées de journal : importe ton export complet pour ajouter tout ton
        historique, tes likes et ta watchlist.
      </p>
      <Link href="/import?onglet=complet" className="btn-primary shrink-0 self-start sm:self-auto">
        Importer mon export <ArrowRightIcon className="size-3.5" />
      </Link>
    </aside>
  );
}
