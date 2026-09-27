"use client";

import { InView } from "@/components/in-view";
import { useI18n } from "@/i18n/client";
import { formatRating } from "@/i18n/format";

/**
 * Note Letterboxd (0,5 à 5) affichée en étoiles : ★★★½
 * `animate` : les étoiles s'allument une à une, en rebond, quand la note entre à l'écran.
 */
export function Stars({ value, className = "", animate = false }: { value: number; className?: string; animate?: boolean }) {
  const { t, locale } = useI18n();
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const label = t.common.rating(formatRating(value, locale));
  if (!animate) {
    return (
      <span className={`tracking-[0.06em] text-tungsten ${className}`} aria-label={label}>
        {"★".repeat(full)}
        {half ? "½" : ""}
      </span>
    );
  }
  const glyphs = [...Array(full).fill("★"), ...(half ? ["½"] : [])];
  return (
    <InView inline className={`tracking-[0.06em] text-tungsten ${className}`} aria-label={label}>
      {glyphs.map((g, i) => (
        <span key={i} aria-hidden className="pop-in" style={{ transitionDelay: `${150 + i * 110}ms` }}>
          {g}
        </span>
      ))}
    </InView>
  );
}
