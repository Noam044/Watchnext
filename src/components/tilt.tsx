"use client";

import { useRef } from "react";

/**
 * Au survol à la souris, l'élément s'incline légèrement vers le curseur et un reflet
 * de projecteur le suit. Rien au toucher ni si les animations sont réduites.
 */
export function Tilt({ children, className = "", max = 7 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--glare", "0");
  };

  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--rx", `${(0.5 - y) * max}deg`);
        el.style.setProperty("--ry", `${(x - 0.5) * max}deg`);
        el.style.setProperty("--gx", `${x * 100}%`);
        el.style.setProperty("--gy", `${y * 100}%`);
        el.style.setProperty("--glare", "1");
      }}
      onPointerLeave={reset}
      className={`relative transition-transform duration-300 ease-out [transform:perspective(800px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] [transform-style:preserve-3d] ${className}`}
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[var(--glare,0)] mix-blend-soft-light transition-opacity duration-300"
        style={{
          background: "radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), rgb(255 236 200 / 0.75), transparent 55%)",
        }}
      />
    </div>
  );
}
