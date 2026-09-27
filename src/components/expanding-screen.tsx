"use client";

import { useEffect, useRef } from "react";

/**
 * Hero de l'accueil : un écran de cinéma qui remplit la première vue, avec `intro`
 * posé dessus comme un carton-titre. Au défilement, l'intro s'efface, l'écran grandit
 * jusqu'aux bords de la fenêtre et la salle s'assombrit, puis `caption` apparaît
 * (nom de l'app et accroche finale).
 *
 * L'écran occupe toujours toute la fenêtre : c'est un masque (clip-path) qui se
 * desserre, piloté par une seule variable CSS --p (0 → 1). Aucun recalcul de mise
 * en page pendant le défilement. Statique si l'utilisateur a réduit les animations.
 *
 * Marges du cadre au repos : --t (en-tête), --b (bas), --x (côtés, largeur max-w-6xl).
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

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const update = () => {
      frame = 0;
      const travel = section.offsetHeight - window.innerHeight;
      const raw =
        reduce.matches || travel <= 0
          ? 0
          : Math.min(1, Math.max(0, -section.getBoundingClientRect().top / travel));
      const p = raw * raw * (3 - 2 * raw); // départ et arrivée en douceur
      section.style.setProperty("--p", p.toFixed(4));
      // Intro et légende ne sont atteignables (souris, clavier, lecteur d'écran) que lorsqu'elles sont visibles.
      section.toggleAttribute("data-scrolled", p > 0.4);
      section.toggleAttribute("data-lit", p > 0.72);
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

  // Marges courantes : celles du repos, multipliées par (1 - p).
  const t = "calc(var(--t) * (1 - var(--p)))";
  const b = "calc(var(--b) * (1 - var(--p)))";
  const x = "calc(var(--x) * (1 - var(--p)))";

  return (
    <section
      ref={sectionRef}
      className="group/screen relative h-[220vh] [--b:24px] [--p:0] [--t:calc(72px+env(safe-area-inset-top))] [--x:max(1rem,calc((100vw-69rem)/2))] motion-reduce:h-svh sm:[--x:max(1.5rem,calc((100vw-69rem)/2))]"
    >
      <div
        className="sticky top-0 h-svh overflow-hidden"
        style={{ backgroundColor: "rgb(0 0 0 / calc(var(--p) * 0.92))" }}
      >
        {/* Halo du projecteur autour du cadre (le masque rognerait une ombre portée par l'écran lui-même) */}
        <div
          aria-hidden
          className="screen-glow pointer-events-none absolute rounded-md"
          style={{ top: t, bottom: b, left: x, right: x, opacity: "calc(1 - var(--p))" }}
        />

        <div
          className="absolute inset-0 animate-projector overflow-hidden bg-black"
          style={{ clipPath: `inset(${t} ${x} ${b} ${x} round calc(6px * (1 - var(--p))))` }}
        >
          {children}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgb(0 0 0 / 0.7))" }}
          />
          {/* Voile derrière l'intro : il s'efface avec elle */}
          <div className="pointer-events-none absolute inset-0" style={{ opacity: "clamp(0, 1 - var(--p) * 2.5, 1)" }}>
            <div className="absolute inset-0 bg-linear-to-t from-velvet-950/95 via-velvet-950/70 to-velvet-950/25" />
            <div className="absolute inset-0 bg-linear-to-r from-velvet-950/70 via-velvet-950/25 to-transparent" />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: "calc(var(--p) * 0.6)" }} />

          <div
            className="absolute p-6 group-data-scrolled/screen:invisible sm:p-10 lg:p-14"
            style={{
              left: x,
              right: x,
              bottom: b,
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
