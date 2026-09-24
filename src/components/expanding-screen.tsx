"use client";

import { useEffect, useRef } from "react";

/**
 * Écran qui grandit au défilement jusqu'à remplir la fenêtre, pendant que la salle
 * s'assombrit autour. La section est haute : l'écran reste fixé (sticky) le temps
 * de l'agrandissement. Sans animation si l'utilisateur les a réduites.
 */
export function ExpandingScreen({ children, caption }: { children: React.ReactNode; caption?: React.ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const screen = screenRef.current;
    if (!section || !screen) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const update = () => {
      frame = 0;
      if (reduce.matches) {
        section.style.setProperty("--p", "0");
        section.removeAttribute("data-lit");
        screen.style.removeProperty("width");
        screen.style.removeProperty("height");
        screen.style.removeProperty("border-radius");
        return;
      }
      const vw = section.clientWidth;
      const vh = window.innerHeight;
      // Taille de départ : la largeur du contenu (max-w-6xl), au format Cinémascope (4:3 sur mobile).
      const w0 = Math.min(vw - (vw < 640 ? 32 : 48), 1104);
      const h0 = w0 / (vw < 640 ? 4 / 3 : 2.39);
      const travel = section.offsetHeight - vh;
      const raw = travel > 0 ? Math.min(1, Math.max(0, -section.getBoundingClientRect().top / travel)) : 0;
      const p = raw * raw * (3 - 2 * raw); // départ et arrivée en douceur

      section.style.setProperty("--p", p.toFixed(4));
      // La légende (et son bouton) n'existe pour la souris, le clavier et les lecteurs d'écran qu'une fois visible.
      section.toggleAttribute("data-lit", p > 0.72);
      screen.style.width = `${w0 + (vw - w0) * p}px`;
      screen.style.height = `${h0 + (vh - h0) * p}px`;
      screen.style.borderRadius = `${6 * (1 - p)}px`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduce.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduce.removeEventListener("change", schedule);
    };
  }, []);

  return (
    <section ref={sectionRef} className="group/screen relative h-[220vh] [--p:0] motion-reduce:h-auto">
      <div
        className="sticky top-0 flex h-svh items-center justify-center overflow-hidden motion-reduce:static motion-reduce:h-auto"
        style={{ backgroundColor: "rgb(0 0 0 / calc(var(--p) * 0.92))" }}
      >
        <div
          ref={screenRef}
          className="screen-glow relative aspect-[4/3] w-[min(100%-2rem,69rem)] animate-projector overflow-hidden rounded-md bg-black sm:aspect-[2.39/1] sm:w-[min(100%-3rem,69rem)]"
        >
          {children}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center, transparent 45%, rgb(0 0 0 / 0.7))",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: "calc(var(--p) * 0.6)" }} />
          {caption && (
            <div
              className="invisible absolute inset-0 grid place-items-center p-6 text-center group-data-lit/screen:visible"
              style={{ opacity: "clamp(0, (var(--p) - 0.72) * 3.6, 1)" }}
            >
              {caption}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
