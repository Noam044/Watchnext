"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { regenerateAction, syncRssAction, unhideAllAction } from "@/actions/library";
import { RefreshIcon, SparkIcon, UploadIcon } from "@/components/icons";
import { toast } from "@/components/toaster";
import { useI18n } from "@/i18n/client";

export function DashboardActions({ username, hiddenCount }: { username: string | null; hiddenCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"sync" | "calc" | null>(null);
  const { t } = useI18n();
  const d = t.dashboard;

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn();
      setStep(null);
      router.refresh();
    });

  const regenerate = async (prefix = "") => {
    setStep("calc");
    const res = await regenerateAction();
    if (res.ok) toast(`${prefix}${d.recalcDone(res.data.count)}`);
    else toast(res.error, "error");
  };

  const resync = () =>
    run(async () => {
      if (!username) return;
      setStep("sync");
      const res = await syncRssAction(username);
      if (!res.ok) return toast(res.error, "error");
      await regenerate(d.syncedEntries(res.data.imported));
    });

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&>*]:shrink-0 max-sm:[&>*]:px-3.5 max-sm:[&>*]:py-2 max-sm:[&>*]:text-xs">
        {username && (
          <button onClick={resync} disabled={pending} className="btn-ghost" title={d.syncTitle(username)}>
            <RefreshIcon className={`size-4 ${pending && step === "sync" ? "animate-spin" : ""}`} />
            {d.sync}
          </button>
        )}
        <button onClick={() => run(() => regenerate())} disabled={pending} className="btn-ghost">
          <SparkIcon className={`size-4 ${pending && step === "calc" ? "animate-pulse" : ""}`} />
          {d.recalc}
        </button>
        <Link href="/import" className="btn-quiet">
          <UploadIcon /> {d.reimport}
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
            {d.unhide(hiddenCount)}
          </button>
        )}
      </div>
      {step && (
        <p aria-live="polite" className="meta flex items-center gap-2">
          <span className="size-2.5 animate-spin rounded-full border-2 border-tungsten border-t-transparent" />
          {step === "sync" ? d.stepSync : d.stepCalc}
        </p>
      )}
    </div>
  );
}
