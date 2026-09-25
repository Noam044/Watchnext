"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { syncStateAction, type SyncStateDTO } from "@/actions/sync";
import { InfoIcon } from "@/components/icons";
import { toast } from "@/components/toaster";
import { useI18n } from "@/i18n/client";
import { formatAgo } from "@/i18n/format";

const POLL_MS = 4000;
const MAX_POLLS = 45; // 3 minutes

/**
 * Où en est la synchronisation avec le journal Letterboxd. Pendant une synchronisation
 * en arrière-plan, interroge le serveur puis rafraîchit la page quand elle est finie.
 */
export function SyncStatus({ initial }: { initial: SyncStateDTO }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [state, setState] = useState(initial);

  // Nouvel état venu du serveur (ex. après « Synchroniser » ou un rafraîchissement).
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setState(initial);
  }

  useEffect(() => {
    if (!state.running) return;
    let polls = 0;
    let done = false;
    const check = async () => {
      if (done) return;
      polls++;
      const next = await syncStateAction().catch(() => null);
      if (done || !next || (next.running && polls < MAX_POLLS)) return;
      done = true;
      clearInterval(timer);
      setState(next);
      if (next.error) toast(next.error, "error");
      else if (next.lastRssSync !== state.lastRssSync) toast(t.dashboard.syncDone);
      router.refresh();
    };
    const timer = setInterval(check, POLL_MS);
    // Onglet en arrière-plan : le navigateur ralentit les minuteries, on vérifie dès le retour.
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      done = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [state.running, state.lastRssSync, router, t]);

  if (state.running) {
    return (
      <p aria-live="polite" className="meta flex items-center gap-2">
        <span className="size-2.5 animate-spin rounded-full border-2 border-tungsten border-t-transparent" />
        {t.dashboard.syncRunning}
      </p>
    );
  }
  if (state.error) {
    return (
      <p className="flex max-w-xl items-start gap-1.5 text-sm text-bad" role="status">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
        {t.dashboard.syncFailed(state.error)}
      </p>
    );
  }
  if (!state.lastRssSync) return null;
  return (
    <p className="meta" suppressHydrationWarning>
      {t.dashboard.syncedAgo(formatAgo(state.lastRssSync, locale))}
    </p>
  );
}
