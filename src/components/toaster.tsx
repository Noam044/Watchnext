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
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6"
    >
      {items.map((t) => (
        <p
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex max-w-md animate-rise items-center gap-2.5 rounded-md border px-4 py-2.5 text-sm shadow-xl shadow-black/50 backdrop-blur ${
            t.tone === "error" ? "border-bad/40 bg-velvet-900/95 text-bad" : "border-velvet-700 bg-velvet-900/95 text-screen"
          }`}
        >
          <span className={`size-1.5 shrink-0 rounded-full ${t.tone === "error" ? "bg-bad" : "bg-exit"}`} />
          {t.text}
        </p>
      ))}
    </div>
  );
}
