"use client";

import { useI18n } from "@/i18n/client";

/** Critique Letterboxd ; celles qui divulguent l'intrigue restent masquées jusqu'au clic. */
export function ReviewText({ text, spoilers, className = "" }: { text: string; spoilers: boolean; className?: string }) {
  const { t } = useI18n();
  const body = (
    <div className={`space-y-3 text-sm leading-relaxed whitespace-pre-line text-screen/90 ${className}`}>{text}</div>
  );
  if (!spoilers) return body;
  return (
    <details className="group">
      <summary className="meta inline-flex cursor-pointer list-none items-center gap-2 rounded-md border border-bad/30 px-3 py-1 text-bad marker:hidden hover:bg-bad/10">
        {t.film.spoilers} · <span className="group-open:hidden">{t.film.show}</span>
        <span className="hidden group-open:inline">{t.film.hideSpoiler}</span>
      </summary>
      <div className="mt-3">{body}</div>
    </details>
  );
}
