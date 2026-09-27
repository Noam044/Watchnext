"use client";

import { useEffect, useRef } from "react";

/**
 * Pose `data-shown` sur son élément la première fois qu'il entre à l'écran. Les animations
 * « à l'apparition » (utilitaires grow-x, grow-y, pop-in, rise-in de globals.css) s'y accrochent,
 * et se jouent donc quand on arrive sur la section plutôt qu'au chargement de la page.
 */
export function InView({
  inline = false,
  className,
  children,
  ...rest
}: { inline?: boolean; className?: string; children: React.ReactNode } & React.AriaAttributes) {
  const ref = useRef<HTMLDivElement & HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.dataset.shown = "";
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.shown = "";
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Tag = inline ? "span" : "div";
  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  );
}
