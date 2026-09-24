"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { regenerateAction, syncRssAction } from "@/actions/library";
import { CheckIcon, ExternalIcon } from "@/components/icons";

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
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = status.kind === "working";

  async function finish(summary: string, notFound?: number) {
    setStatus({ kind: "working", message: "Calcul de tes recommandations…" });
    const res = await regenerateAction();
    if (!res.ok) {
      setStatus({ kind: "error", message: `${summary} Mais le calcul des recommandations a échoué : ${res.error}` });
      router.refresh();
      return;
    }
    setStatus({ kind: "done", message: `${summary} ${res.data.count} recommandations prêtes.`, notFound });
    router.refresh();
  }

  async function runQuick(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setStatus({ kind: "working", message: "Lecture de ton flux RSS Letterboxd…" });
    const res = await syncRssAction(username);
    if (!res.ok) return setStatus({ kind: "error", message: res.error });
    await finish(`${res.data.imported} films récupérés depuis le flux de ${res.data.username}.`);
  }

  async function processJob(jobId: string) {
    for (;;) {
      const res = await fetch(`/api/import/${jobId}/process`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return setStatus({
          kind: "error",
          message: body.error ?? "Le traitement de l'import a échoué.",
          resumeJobId: jobId,
        });
      }
      const p = body as Progress;
      const pct = p.total ? p.processed / p.total : 1;
      setStatus({
        kind: "working",
        message: `Correspondance avec TMDB : ${p.processed} / ${p.total} films`,
        progress: pct,
      });
      if (p.status === "DONE") {
        const nf = p.notFound ? ` ${p.notFound} introuvable${p.notFound > 1 ? "s" : ""} sur TMDB.` : "";
        return finish(`${p.matched} films importés.${nf}`, p.notFound);
      }
    }
  }

  async function runFull(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;
    setStatus({ kind: "working", message: "Lecture de l'export…", progress: 0 });
    const form = new FormData();
    for (const f of files) form.append("files", f);
    const res = await fetch("/api/import", { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setStatus({ kind: "error", message: body.error ?? "Envoi impossible." });
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
            ["quick", "Import rapide", "Pseudo Letterboxd · RSS"],
            ["full", "Import complet", "Export .zip ou CSV"],
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
            className={`relative px-4 py-4 text-left transition sm:px-6 ${tab === id ? "bg-velvet-850" : "hover:bg-velvet-850/50"}`}
          >
            <span className={`flex items-center gap-2 text-sm font-medium ${tab === id ? "text-screen" : "text-dust-300"}`}>
              {title}
              {id === "full" && (
                <span className="rounded-sm border border-tungsten/50 px-1.5 py-px font-mono text-[10px] font-bold tracking-wide text-tungsten uppercase">
                  Recommandé
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
              <span className="field-label">Ton pseudo Letterboxd</span>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-dust-400">
                    letterboxd.com/
                  </span>
                  <input
                    className="input pl-[7.4rem]"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="pseudo"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    disabled={busy}
                  />
                </div>
                <button className="btn-primary sm:w-auto" disabled={busy || !username.trim()}>
                  {busy ? "Import en cours…" : "Importer"}
                </button>
              </div>
            </label>
            <p className="flex gap-2 text-sm text-dust-400">
              <InfoIcon />
              <span>
                On lit ton flux RSS public : seules tes <strong className="text-dust-300">~50 dernières entrées</strong> de
                journal sont récupérées. Pour tout ton historique, utilise l&apos;import complet.
              </span>
            </p>
          </form>
        ) : (
          <form onSubmit={runFull}>
            <p className="text-sm text-dust-300">
              Ton export contient tout ton historique : films vus, notes, likes, journal et watchlist. Trois étapes :
            </p>
            <ol className="relative mt-6 space-y-7 border-l border-velvet-700 pl-8">
              <Step n={1} done={openedLetterboxd} title="Ouvre tes réglages Letterboxd">
                <p className="text-sm text-dust-300">
                  La page <strong className="text-screen">Settings › Data</strong> s&apos;ouvre dans un nouvel onglet.
                  Connecte-toi à Letterboxd si besoin.
                </p>
                <a
                  href={LETTERBOXD_DATA_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpenedLetterboxd(true)}
                  className="btn mt-3 border border-tungsten/60 text-tungsten hover:border-tungsten hover:bg-tungsten-soft"
                >
                  <span className="sm:hidden">Ouvrir mes réglages Letterboxd</span>
                  <span className="hidden sm:inline">Ouvrir letterboxd.com/settings/data</span>
                  <ExternalIcon className="size-3.5" />
                </a>
              </Step>

              <Step n={2} done={files.length > 0} title="Clique sur « Export your data »">
                <p className="text-sm text-dust-300">
                  Letterboxd prépare un fichier <strong className="text-screen">.zip</strong> et le télécharge, en
                  quelques secondes.
                </p>
              </Step>

              <Step n={3} done={files.length > 0} title="Dépose le .zip ici">
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
                  className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-9 text-center transition ${
                    dragging ? "border-tungsten bg-tungsten-soft" : "border-velvet-600 hover:border-dust-400"
                  }`}
                >
                  <UploadIcon />
                  <p className="mt-3 text-sm text-screen">
                    Dépose ton export <strong>.zip</strong> tel quel, sans le décompresser
                  </p>
                  <p className="mt-1 text-xs text-dust-400">ou clique pour parcourir · .zip ou .csv · 25 Mo max</p>
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
                          aria-label={`Retirer ${f.name}`}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <button className="btn-primary mt-4 w-full sm:w-auto" disabled={busy || files.length === 0}>
                  {busy ? "Import en cours…" : "Lancer l'import"}
                </button>
              </Step>
            </ol>

            <p className="mt-7 border-t border-velvet-800 pt-4 text-xs leading-relaxed text-dust-400">
              Tu peux aussi envoyer seulement <code className="text-dust-300">watched.csv</code>,{" "}
              <code className="text-dust-300">ratings.csv</code>, <code className="text-dust-300">diary.csv</code> et{" "}
              <code className="text-dust-300">watchlist.csv</code>. Ces fichiers ne contiennent pas d&apos;identifiant
              TMDB : chaque film est retrouvé par son titre et son année, et les rares films introuvables te seront
              listés.
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
      <div role="alert" className="mt-6 rounded-xl border border-bad/30 bg-bad/10 p-4 text-sm text-bad">
        <p>{status.message}</p>
        {status.resumeJobId && (
          <button onClick={() => onResume(status.resumeJobId!)} className="btn-ghost mt-3 text-screen">
            Reprendre l&apos;import
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-xl border border-exit/25 bg-exit/10 p-4 text-sm sm:flex-row sm:items-center">
      <p className="flex-1 text-screen">{status.message}</p>
      <div className="flex gap-2">
        {!!status.notFound && (
          <a href="#introuvables" className="btn-ghost">
            Voir les introuvables
          </a>
        )}
        <button onClick={onOpen} className="btn-primary">
          Voir mes recommandations
        </button>
      </div>
    </div>
  );
}

/** Étape du guide d'export : pastille numérotée sur la frise, cochée une fois faite. */
function Step({ n, done, title, children }: { n: number; done: boolean; title: string; children: React.ReactNode }) {
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
        <span className="sr-only">Étape {n}{done ? " (faite)" : ""} : </span>
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
