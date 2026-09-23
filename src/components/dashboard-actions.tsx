"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { regenerateAction, syncRssAction, unhideAllAction } from "@/actions/library";

export function DashboardActions({ username, hiddenCount }: { username: string | null; hiddenCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [step, setStep] = useState<string | null>(null);

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      setMessage(null);
      await fn();
      setStep(null);
      router.refresh();
    });

  const regenerate = async (prefix = "") => {
    setStep("Calcul des recommandations…");
    const res = await regenerateAction();
    setMessage(
      res.ok
        ? { tone: "ok", text: `${prefix}${res.data.count} recommandations mises à jour.` }
        : { tone: "error", text: res.error },
    );
  };

  const resync = () =>
    run(async () => {
      if (!username) return;
      setStep("Synchronisation du flux RSS…");
      const res = await syncRssAction(username);
      if (!res.ok) return setMessage({ tone: "error", text: res.error });
      await regenerate(`${res.data.imported} entrées synchronisées. `);
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {username && (
          <button onClick={resync} disabled={pending} className="btn-ghost">
            <RefreshIcon spinning={pending && step?.startsWith("Synchro")} />
            Resynchroniser (RSS)
          </button>
        )}
        <button onClick={() => run(() => regenerate())} disabled={pending} className="btn-ghost">
          <SparkIcon />
          Recalculer
        </button>
        <Link href="/import" className="btn-ghost">
          Réimporter un export
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
            className="btn px-3 text-ink-400 hover:text-ink-100"
          >
            Réafficher les {hiddenCount} masqué{hiddenCount > 1 ? "s" : ""}
          </button>
        )}
      </div>
      {(step || message) && (
        <p
          aria-live="polite"
          className={`text-sm ${message?.tone === "error" && !step ? "text-bad" : step ? "text-ink-300" : "text-good"}`}
        >
          {step ?? message?.text}
        </p>
      )}
    </div>
  );
}

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`size-4 ${spinning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6M16.5 3.5v3.5H13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden>
      <path d="M10 2l1.6 4.8L16.5 8.5l-4.9 1.7L10 15l-1.6-4.8L3.5 8.5l4.9-1.7L10 2Z" />
    </svg>
  );
}
