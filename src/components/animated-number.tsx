"use client";

import NumberFlow, { type Format } from "@number-flow/react";
import { useEffect, useState } from "react";

/**
 * Nombre qui défile jusqu'à sa valeur à l'affichage, puis à chaque changement
 * (ex. quand un filtre change le total). Statique si l'utilisateur réduit les animations.
 */
export function AnimatedNumber({
  value,
  format,
  suffix,
  delay = 0,
  className,
}: {
  value: number;
  format?: Format;
  suffix?: string;
  /** Délai avant le premier défilement, en ms (pour suivre l'allumage de l'écran). */
  delay?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <NumberFlow
      value={shown}
      locales="fr-FR"
      format={format}
      suffix={suffix}
      className={className}
      aria-label={`${value.toLocaleString("fr-FR", format)}${suffix ?? ""}`}
    />
  );
}
