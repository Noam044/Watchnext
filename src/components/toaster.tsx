"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; tone: "ok" | "error"; text: string };

const EVENT = "watchnext:toast";

/** Affiche une notification courte en bas de l'écran. Utilisable depuis n'importe quel composant client. */
export function toast(text: string, tone: Toast["tone"] = "ok") {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { text, tone } }));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    let next = 0;
    const onToast = (e: Event) => {
      const { text, tone } = (e as CustomEvent<Omit<Toast, "id">>).detail;
      const id = ++next;
      setItems((prev) => [...prev.slice(-2), { id, text, tone }]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), tone === "error" ? 6000 : 3500);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
    >
      {items.map((t) => (
        <p
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex max-w-md origin-bottom animate-pop items-center gap-2.5 rounded-md border px-4 py-2.5 text-sm shadow-xl shadow-black/50 backdrop-blur ${
            t.tone === "error" ? "border-bad/40 bg-velvet-900/95 text-bad" : "border-velvet-700 bg-velvet-900/95 text-screen"
          }`}
        >
          {/* Pastille qui pulse deux fois à l'arrivée du message. */}
          <span className="relative grid size-1.5 shrink-0">
            <span
              className={`absolute inset-0 animate-ping rounded-full [animation-iteration-count:2] ${t.tone === "error" ? "bg-bad" : "bg-exit"}`}
            />
            <span className={`rounded-full ${t.tone === "error" ? "bg-bad" : "bg-exit"}`} />
          </span>
          {t.text}
        </p>
      ))}
    </div>
  );
}
