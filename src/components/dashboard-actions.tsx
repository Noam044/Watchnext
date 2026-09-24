"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { regenerateAction, syncRssAction, unhideAllAction } from "@/actions/library";
import { RefreshIcon, SparkIcon, UploadIcon } from "@/components/icons";
import { toast } from "@/components/toaster";

export function DashboardActions({ username, hiddenCount }: { username: string | null; hiddenCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<string | null>(null);

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn();
      setStep(null);
      router.refresh();
    });

  const regenerate = async (prefix = "") => {
    setStep("Calcul des recommandations…");
    const res = await regenerateAction();
    if (res.ok) toast(`${prefix}${res.data.count} recommandations mises à jour.`);
    else toast(res.error, "error");
  };

  const resync = () =>
    run(async () => {
      if (!username) return;
      setStep("Synchronisation du flux RSS…");
      const res = await syncRssAction(username);
      if (!res.ok) return toast(res.error, "error");
      await regenerate(`${res.data.imported} entrées synchronisées. `);
    });

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&>*]:shrink-0 max-sm:[&>*]:px-3.5 max-sm:[&>*]:py-2 max-sm:[&>*]:text-xs">
        {username && (
          <button onClick={resync} disabled={pending} className="btn-ghost" title={`Relire le flux RSS de ${username}`}>
            <RefreshIcon className={`size-4 ${pending && step?.startsWith("Synchro") ? "animate-spin" : ""}`} />
            Synchroniser
          </button>
        )}
        <button onClick={() => run(() => regenerate())} disabled={pending} className="btn-ghost">
          <SparkIcon className={`size-4 ${pending && step?.startsWith("Calcul") ? "animate-pulse" : ""}`} />
          Recalculer
        </button>
        <Link href="/import" className="btn-quiet">
          <UploadIcon /> Réimporter
        </Link>
        {hiddenCount > 0 && (
          <button
            onClick={() =>
              run(async () => {
                await unhideAllAction();
                await regenerate();
              })
            }
            disabled={pending}
            className="btn-quiet"
          >
            Réafficher {hiddenCount} masqué{hiddenCount > 1 ? "s" : ""}
          </button>
        )}
      </div>
      {step && (
        <p aria-live="polite" className="meta flex items-center gap-2">
          <span className="size-2.5 animate-spin rounded-full border-2 border-tungsten border-t-transparent" />
          {step}
        </p>
      )}
    </div>
  );
}
