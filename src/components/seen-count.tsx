"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { pop } from "@/lib/fx";

/** Événement émis quand un film est marqué « Déjà vu » (detail : +1, ou -1 si l'action échoue). */
export const SEEN_EVENT = "watchnext:seen";

export function countSeen(delta: 1 | -1) {
  window.dispatchEvent(new CustomEvent(SEEN_EVENT, { detail: delta }));
}

/**
 * Nombre de films vus dans l'en-tête de « À voir » : il défile jusqu'au total à l'arrivée,
 * puis gagne un point (avec un rebond) à chaque « Déjà vu », comme un compteur d'expérience.
 */
export function SeenCount({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  const ref = useRef<HTMLSpanElement>(null);

  // Nouveau total venu du serveur (ex. après une synchronisation).
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setCount(initial);
  }

  useEffect(() => {
    const onSeen = (e: Event) => {
      setCount((n) => n + (e as CustomEvent<number>).detail);
      pop(ref.current, 1.4);
    };
    window.addEventListener(SEEN_EVENT, onSeen);
    return () => window.removeEventListener(SEEN_EVENT, onSeen);
  }, []);

  return (
    <span ref={ref} className="inline-block font-semibold text-screen tabular-nums">
      <AnimatedNumber value={count} delay={300} />
    </span>
  );
}
