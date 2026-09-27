"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { regenerateAction, syncRssAction, unhideAllAction } from "@/actions/library";
import { RefreshIcon, SparkIcon, UploadIcon } from "@/components/icons";
import { toast } from "@/components/toaster";
import { useI18n } from "@/i18n/client";
import { burst, haptic } from "@/lib/fx";

export function DashboardActions({ username, hiddenCount }: { username: string | null; hiddenCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"sync" | "calc" | null>(null);
  const { t } = useI18n();
  const d = t.dashboard;
  // Position du bouton cliqué : les étincelles en jaillissent quand le calcul est terminé.
  const from = useRef<DOMRect | null>(null);
  const aim = (e: React.MouseEvent<HTMLElement>) => (from.current = e.currentTarget.getBoundingClientRect());

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn();
      setStep(null);
      router.refresh();
    });

  const regenerate = async (prefix = "") => {
    setStep("calc");
    const res = await regenerateAction();
    if (res.ok) {
      burst(from.current, { shapes: ["spark", "star"] });
      haptic([10, 30, 10]);
      toast(`${prefix}${d.recalcDone(res.data.count)}`);
    }
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
    <div className="flex flex-col gap-2 max-sm:items-stretch sm:items-end">
      {/* Sur téléphone : boutons de même largeur, icône au-dessus du libellé, dernière action sur toute la ligne. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-2 sm:flex sm:flex-wrap max-sm:[&>*]:flex-col max-sm:[&>*]:gap-1 max-sm:[&>*]:px-2 max-sm:[&>*]:py-2.5 max-sm:[&>*]:text-xs">
        {username && (
          <button
            onClick={(e) => {
              aim(e);
              resync();
            }}
            disabled={pending}
            className="btn-ghost"
            title={d.syncTitle(username)}
          >
            <RefreshIcon className={`size-4 ${pending && step === "sync" ? "animate-spin" : ""}`} />
            {d.sync}
          </button>
        )}
        <button
          onClick={(e) => {
            aim(e);
            run(() => regenerate());
          }}
          disabled={pending}
          className="btn-ghost"
        >
          <SparkIcon className={`size-4 ${pending && step === "calc" ? "animate-pulse" : ""}`} />
          {d.recalc}
        </button>
        <Link href="/import" className="btn-ghost sm:border-transparent sm:text-dust-300 sm:hover:text-screen">
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
            className="btn-quiet max-sm:col-span-full"
          >
            {d.unhide(hiddenCount)}
          </button>
        )}
      </div>
      {step && (
        <p aria-live="polite" className="meta flex items-center gap-2 max-sm:justify-center">
          <span className="size-2.5 animate-spin rounded-full border-2 border-tungsten border-t-transparent" />
          {step === "sync" ? d.stepSync : d.stepCalc}
        </p>
      )}
    </div>
  );
}
