"use client";

import { useLayoutEffect, useRef } from "react";
import { reducedMotion } from "@/lib/fx";

/**
 * Quand une liste change (film retiré, filtre appliqué), chaque élément déjà présent glisse
 * en douceur de son ancienne place vers la nouvelle au lieu de sauter, en léger décalé
 * d'un élément à l'autre (effet de cascade).
 * Les enfants directs du conteneur doivent porter `data-flip="<identifiant stable>"`.
 */
export function useFlip<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const previous = useRef(new Map<string, { x: number; y: number }>());

  // Après chaque rendu : on compare les positions (relatives au conteneur, donc indépendantes du défilement).
  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;
    const next = new Map<string, { x: number; y: number }>();
    let moved = 0;
    for (const child of container.children) {
      const id = (child as HTMLElement).dataset.flip;
      if (!id) continue;
      const el = child as HTMLElement;
      const at = { x: el.offsetLeft, y: el.offsetTop };
      next.set(id, at);
      const was = previous.current.get(id);
      if (was && (was.x !== at.x || was.y !== at.y) && !reducedMotion()) {
        // « backwards » : pendant son petit délai, l'élément reste à son ancienne place.
        el.animate([{ translate: `${was.x - at.x}px ${was.y - at.y}px` }, { translate: "0 0" }], {
          duration: 850,
          delay: Math.min(moved++ * 35, 280),
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "backwards",
        });
      }
    }
    previous.current = next;
  });

  return ref;
}
