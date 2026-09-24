"use client";

import { useEffect, useRef } from "react";

/** Hauteur réservée à l'en-tête au-dessus de l'écran, et marge sous l'écran (px). */
const TOP_GAP = 72;
const BOTTOM_GAP = 24;
const MIN_HEIGHT = 440;

/**
 * Hero de l'accueil : un écran de cinéma qui remplit la première vue, avec `intro`
 * posé dessus comme un carton-titre. Au défilement, l'intro s'efface, l'écran grandit
 * jusqu'aux bords de la fenêtre et la salle s'assombrit, puis `caption` apparaît (nom de l'app et accroche finale).
 * La section est haute : l'écran reste fixé (sticky) le temps de l'agrandissement.
 * Statique si l'utilisateur a réduit les animations.
 */
export function ExpandingScreen({
  children,
  intro,
  caption,
}: {
  children: React.ReactNode;
  intro: React.ReactNode;
  caption?: React.ReactNode;
}) {
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
        section.removeAttribute("data-scrolled");
        for (const prop of ["width", "height", "border-radius", "translate"]) screen.style.removeProperty(prop);
        return;
      }
      const vw = section.clientWidth;
      const vh = window.innerHeight;
      // Taille de départ : la largeur du contenu (max-w-6xl) et toute la hauteur sous l'en-tête.
      const w0 = Math.min(vw - (vw < 640 ? 32 : 48), 1104);
      const h0 = Math.max(vh - TOP_GAP - BOTTOM_GAP, MIN_HEIGHT);
      const travel = section.offsetHeight - vh;
      const raw = travel > 0 ? Math.min(1, Math.max(0, -section.getBoundingClientRect().top / travel)) : 0;
      const p = raw * raw * (3 - 2 * raw); // départ et arrivée en douceur

      section.style.setProperty("--p", p.toFixed(4));
      // Intro et légende ne sont atteignables (souris, clavier, lecteur d'écran) que lorsqu'elles sont visibles.
      section.toggleAttribute("data-scrolled", p > 0.4);
      section.toggleAttribute("data-lit", p > 0.72);
      screen.style.width = `${w0 + (vw - w0) * p}px`;
      screen.style.height = `${h0 + (vh - h0) * p}px`;
      screen.style.borderRadius = `${6 * (1 - p)}px`;
      // Centré dans la fenêtre, l'écran est décalé vers le bas pour laisser la place à l'en-tête.
      // (propriété `translate` : c'est elle que la classe Tailwind translate-y-6 pose au premier rendu)
      screen.style.translate = `0 ${((TOP_GAP - BOTTOM_GAP) / 2) * (1 - p)}px`;
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
        className="sticky top-0 flex h-svh items-center justify-center overflow-hidden motion-reduce:static motion-reduce:h-auto motion-reduce:pt-[72px] motion-reduce:pb-6"
        style={{ backgroundColor: "rgb(0 0 0 / calc(var(--p) * 0.92))" }}
      >
        <div
          ref={screenRef}
          className="screen-glow relative h-[max(calc(100svh-6rem),27.5rem)] w-[min(100%-2rem,69rem)] translate-y-6 animate-projector overflow-hidden rounded-md bg-black sm:w-[min(100%-3rem,69rem)] motion-reduce:translate-y-0"
        >
          {children}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgb(0 0 0 / 0.7))" }}
          />
          {/* Voile sombre : fort derrière l'intro, il s'éclaircit quand l'intro s'efface puis revient pour la légende */}
          <div className="pointer-events-none absolute inset-0" style={{ opacity: "clamp(0, 1 - var(--p) * 2.5, 1)" }}>
            <div className="absolute inset-0 bg-linear-to-t from-velvet-950/95 via-velvet-950/70 to-velvet-950/25" />
            <div className="absolute inset-0 bg-linear-to-r from-velvet-950/70 via-velvet-950/25 to-transparent" />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: "calc(var(--p) * 0.6)" }} />

          <div
            className="absolute inset-x-0 bottom-0 p-6 group-data-scrolled/screen:invisible sm:p-10 lg:p-14"
            style={{
              opacity: "clamp(0, 1 - var(--p) * 2.5, 1)",
              transform: "translateY(calc(var(--p) * -60px))",
            }}
          >
            {intro}
          </div>

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
