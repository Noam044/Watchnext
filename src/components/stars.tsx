/** Note Letterboxd (0,5 à 5) affichée en étoiles : ★★★½ */
export function Stars({ value, className = "" }: { value: number; className?: string }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className={`tracking-[0.06em] text-tungsten ${className}`} aria-label={`${formatRating(value)} sur 5`}>
      {"★".repeat(full)}
      {half ? "½" : ""}
    </span>
  );
}

export function formatRating(value: number) {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}
