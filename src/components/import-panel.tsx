"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { regenerateAction, syncRssAction } from "@/actions/library";
import { CheckIcon, ExternalIcon } from "@/components/icons";
import { useI18n } from "@/i18n/client";

type Tab = "quick" | "full";

const LETTERBOXD_DATA_URL = "https://letterboxd.com/settings/data/";

type Status =
  | { kind: "idle" }
  | { kind: "working"; message: string; progress?: number }
  | { kind: "error"; message: string; resumeJobId?: string }
  | { kind: "done"; message: string; notFound?: number };

type Progress = { id: string; status: string; total: number; processed: number; matched: number; notFound: number };

export function ImportPanel({
  defaultUsername,
  defaultTab = "quick",
}: {
  defaultUsername?: string | null;
  defaultTab?: Tab;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [username, setUsername] = useState(defaultUsername ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [openedLetterboxd, setOpenedLetterboxd] = useState(false);
  const i = useI18n().t.importPage;
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = status.kind === "working";

  async function finish(summary: string, notFound?: number) {
    setStatus({ kind: "working", message: i.computing });
    const res = await regenerateAction();
    if (!res.ok) {
      setStatus({ kind: "error", message: i.computeFailed(summary, res.error) });
      router.refresh();
      return;
    }
    setStatus({ kind: "done", message: i.ready(summary, res.data.count), notFound });
    router.refresh();
  }

  async function runQuick(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setStatus({ kind: "working", message: i.readingRss });
    const res = await syncRssAction(username);
    if (!res.ok) return setStatus({ kind: "error", message: res.error });
    await finish(i.rssDone(res.data.imported, res.data.username));
  }

  async function processJob(jobId: string) {
    for (;;) {
      const res = await fetch(`/api/import/${jobId}/process`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return setStatus({
          kind: "error",
          message: body.error ?? i.processFailed,
          resumeJobId: jobId,
        });
      }
      const p = body as Progress;
      const pct = p.total ? p.processed / p.total : 1;
      setStatus({
        kind: "working",
        message: i.matching(p.processed, p.total),
        progress: pct,
      });
      if (p.status === "DONE") {
        return finish(i.imported(p.matched, p.notFound ? i.notFoundCount(p.notFound) : ""), p.notFound);
      }
    }
  }

  async function runFull(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;
    setStatus({ kind: "working", message: i.readingExport, progress: 0 });
    const form = new FormData();
    for (const f of files) form.append("files", f);
    const res = await fetch("/api/import", { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setStatus({ kind: "error", message: body.error ?? i.uploadFailed });
    await processJob(body.jobId);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const accepted = [...list].filter((f) => /\.(zip|csv)$/i.test(f.name));
    setFiles((prev) => {
      const byName = new Map(prev.map((f) => [f.name, f]));
      for (const f of accepted) byName.set(f.name, f);
      return [...byName.values()];
    });
  }

  return (
    <div className="card overflow-hidden">
      <div role="tablist" className="grid grid-cols-2 border-b border-velvet-800">
        {(
          [
            ["quick", i.tabQuick, i.tabQuickSub],
            ["full", i.tabFull, i.tabFullSub],
          ] as const
        ).map(([id, title, sub]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            disabled={busy}
            onClick={() => {
              setTab(id);
              setStatus({ kind: "idle" });
            }}
            // Téléphone : libellé centré, le badge passe sous le titre plutôt que de le couper.
            className={`relative flex flex-col items-center justify-center px-3 py-4 text-center transition sm:items-start sm:px-6 sm:text-left ${tab === id ? "bg-velvet-850" : "hover:bg-velvet-850/50"}`}
          >
            <span className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-medium sm:justify-start ${tab === id ? "text-screen" : "text-dust-300"}`}>
              {title}
              {id === "full" && (
                <span className="rounded-sm border border-tungsten/50 px-1.5 py-px font-mono text-[10px] font-bold tracking-wide text-tungsten uppercase">
                  {i.recommended}
                </span>
              )}
            </span>
            <span className="block text-xs text-dust-400">{sub}</span>
            {tab === id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-tungsten" />}
          </button>
        ))}
      </div>

      <div className="p-5 sm:p-7">
        {tab === "quick" ? (
          <form onSubmit={runQuick} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="field-label">{i.usernameLabel}</span>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-dust-400">
                    letterboxd.com/
                  </span>
                  <input
                    className="input pl-[7.4rem]"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={i.usernamePlaceholder}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    disabled={busy}
                  />
                </div>
                <button className="btn-primary sm:w-auto" disabled={busy || !username.trim()}>
                  {busy ? i.importing : i.importButton}
                </button>
              </div>
            </label>
            <p className="flex gap-2 text-sm text-dust-400">
              <InfoIcon />
              <span>
                {i.quickInfoBefore}
                <strong className="text-dust-300">{i.quickInfoStrong}</strong>
                {i.quickInfoAfter}
              </span>
            </p>
          </form>
        ) : (
          <form onSubmit={runFull}>
            <p className="text-sm text-dust-300">
              {i.fullIntro}
            </p>
            <ol className="relative mt-6 space-y-7 border-l border-velvet-700 pl-8">
              <Step n={1} done={openedLetterboxd} title={i.step1Title} label={i.stepLabel}>
                <p className="text-sm text-dust-300">
                  {i.step1Before}
                  <strong className="text-screen">Settings › Data</strong>
                  {i.step1After}
                </p>
                <a
                  href={LETTERBOXD_DATA_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpenedLetterboxd(true)}
                  className="btn mt-3 border border-tungsten/60 text-tungsten hover:border-tungsten hover:bg-tungsten-soft"
                >
                  <span className="sm:hidden">{i.step1ButtonShort}</span>
                  <span className="hidden sm:inline">{i.step1ButtonLong}</span>
                  <ExternalIcon className="size-3.5" />
                </a>
              </Step>

              <Step n={2} done={files.length > 0} title={i.step2Title} label={i.stepLabel}>
                <p className="text-sm text-dust-300">
                  {i.step2Before}
                  <strong className="text-screen">.zip</strong>
                  {i.step2After}
                </p>
              </Step>

              <Step n={3} done={files.length > 0} title={i.step3Title} label={i.stepLabel}>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    addFiles(e.dataTransfer.files);
                  }}
                  onClick={() => !busy && inputRef.current?.click()}
                  className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-9 text-center transition ${
                    dragging ? "border-tungsten bg-tungsten-soft" : "border-velvet-600 hover:border-dust-400"
                  }`}
                >
                  <UploadIcon />
                  <p className="mt-3 text-sm text-screen">
                    {i.dropBefore}
                    <strong>.zip</strong>
                    {i.dropAfter}
                  </p>
                  <p className="mt-1 text-xs text-dust-400">{i.dropHint}</p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".zip,.csv,application/zip,text/csv"
                    multiple
                    hidden
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </div>

                {files.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {files.map((f) => (
                      <li key={f.name} className="flex items-center gap-2 rounded-full bg-velvet-800 py-1 pr-1 pl-3 text-xs">
                        {f.name}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setFiles((prev) => prev.filter((p) => p !== f))}
                          className="grid size-5 place-items-center rounded-full text-dust-400 hover:bg-velvet-700 hover:text-screen"
                          aria-label={i.removeFile(f.name)}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <button className="btn-primary mt-4 w-full sm:w-auto" disabled={busy || files.length === 0}>
                  {busy ? i.importing : i.launch}
                </button>
              </Step>
            </ol>

            <p className="mt-7 border-t border-velvet-800 pt-4 text-xs leading-relaxed text-dust-400">
              {i.csvNoteBefore}
              <code className="text-dust-300">watched.csv</code>, <code className="text-dust-300">ratings.csv</code>,{" "}
              <code className="text-dust-300">diary.csv</code>
              {i.csvNoteAnd}
              <code className="text-dust-300">watchlist.csv</code>
              {i.csvNoteAfter}
            </p>
          </form>
        )}

        <StatusBox status={status} onResume={(id) => processJob(id)} onOpen={() => router.push("/dashboard")} />
      </div>
    </div>
  );
}

function StatusBox({
  status,
  onResume,
  onOpen,
}: {
  status: Status;
  onResume: (jobId: string) => void;
  onOpen: () => void;
}) {
  const i = useI18n().t.importPage;
  if (status.kind === "idle") return null;
  if (status.kind === "working") {
    return (
      <div className="mt-6 space-y-3" aria-live="polite">
        <p className="flex items-center gap-2 text-sm text-dust-300">
          <span className="size-3 animate-spin rounded-full border-2 border-tungsten border-t-transparent" />
          {status.message}
        </p>
        {status.progress !== undefined && (
          <div className="h-1.5 overflow-hidden rounded-full bg-velvet-800">
            <div
              className="h-full rounded-full bg-tungsten transition-all duration-500"
              style={{ width: `${Math.round(status.progress * 100)}%` }}
            />
          </div>
        )}
      </div>
    );
  }
  if (status.kind === "error") {
    return (
      <div role="alert" className="mt-6 rounded-md border border-bad/30 bg-bad/10 p-4 text-sm text-bad">
        <p>{status.message}</p>
        {status.resumeJobId && (
          <button onClick={() => onResume(status.resumeJobId!)} className="btn-ghost mt-3 text-screen max-sm:w-full">
            {i.resume}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-md border border-exit/25 bg-exit/10 p-4 text-sm sm:flex-row sm:items-center">
      <p className="flex-1 text-screen">{status.message}</p>
      {/* Téléphone : boutons de même largeur sur toute la ligne. */}
      <div className="grid auto-cols-fr grid-flow-col gap-2 sm:flex">
        {!!status.notFound && (
          <a href="#introuvables" className="btn-ghost">
            {i.seeUnmatched}
          </a>
        )}
        <button onClick={onOpen} className="btn-primary">
          {i.seeRecos}
        </button>
      </div>
    </div>
  );
}

/** Étape du guide d'export : pastille numérotée sur la frise, cochée une fois faite. */
function Step({
  n,
  done,
  title,
  label,
  children,
}: {
  n: number;
  done: boolean;
  title: string;
  label: (n: number, done: boolean) => string;
  children: React.ReactNode;
}) {
  return (
    <li className="relative">
      <span
        className={`absolute top-0 -left-[calc(2rem+0.8rem)] grid size-[1.6rem] place-items-center rounded-full border font-mono text-xs font-bold transition ${
          done ? "border-exit bg-exit text-velvet-950" : "border-tungsten/50 bg-velvet-900 text-tungsten"
        }`}
        aria-hidden
      >
        {done ? <CheckIcon className="size-3.5" /> : n}
      </span>
      <h3 className="font-semibold">
        <span className="sr-only">{label(n, done)}</span>
        {title}
      </h3>
      <div className="mt-1.5">{children}</div>
    </li>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" fill="currentColor" aria-hidden>
      <path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-11.5a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0ZM9.25 9h1.5v5h-1.5V9Z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-8 text-dust-400" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
