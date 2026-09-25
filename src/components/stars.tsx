"use client";

import { useI18n } from "@/i18n/client";
import { formatRating } from "@/i18n/format";

/** Note Letterboxd (0,5 à 5) affichée en étoiles : ★★★½ */
export function Stars({ value, className = "" }: { value: number; className?: string }) {
  const { t, locale } = useI18n();
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className={`tracking-[0.06em] text-tungsten ${className}`} aria-label={t.common.rating(formatRating(value, locale))}>
      {"★".repeat(full)}
      {half ? "½" : ""}
    </span>
  );
}

