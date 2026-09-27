"use client";

import { useLayoutEffect, useRef } from "react";
import { SPRING, reducedMotion } from "@/lib/fx";

/**
 * Quand une liste change (film retiré, filtre appliqué), chaque élément déjà présent glisse
 * en ressort de son ancienne place vers la nouvelle au lieu de sauter.
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
    for (const child of container.children) {
      const id = (child as HTMLElement).dataset.flip;
      if (!id) continue;
      const el = child as HTMLElement;
      const at = { x: el.offsetLeft, y: el.offsetTop };
      next.set(id, at);
      const was = previous.current.get(id);
      if (was && (was.x !== at.x || was.y !== at.y) && !reducedMotion()) {
        el.animate([{ translate: `${was.x - at.x}px ${was.y - at.y}px` }, { translate: "0 0" }], {
          duration: 600,
          easing: SPRING,
        });
      }
    }
    previous.current = next;
  });

  return ref;
}
