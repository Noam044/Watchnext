"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { useI18n } from "@/i18n/client";
import { formatRating } from "@/i18n/format";
import { backdropUrl, posterUrl } from "@/lib/tmdb-images";

export type FilmstripFrame = {
  id: string;
  tmdbId: number;
  title: string;
  year: number | null;
  backdropPath: string | null;
  posterPath: string | null;
  rating: number | null;
  liked: boolean;
};

/**
 * Bande de pellicule 35 mm : les images restent en négatif orangé et se
 * « développent » quand elles passent dans la fenêtre de projection, au centre.
 * Défilement avec aimantation, flèches du clavier ; tout en positif si les animations sont réduites.
 */
export function Filmstrip({ frames, label }: { frames: FilmstripFrame[]; label: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const { t, locale } = useI18n();

  // La vue « dans la fenêtre » est celle qui croise la ligne verticale au centre du défilement.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { root: scroller, rootMargin: "0px -50% 0px -50%", threshold: 0 },
    );
    for (const el of frameRefs.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [frames.length]);

  const goTo = (i: number) => {
    const el = frameRefs.current[Math.max(0, Math.min(frames.length - 1, i))];
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const current = frames[active];

  return (
    <div>
      <div className="relative -mx-4 sm:mx-0">
        <div
          ref={scrollerRef}
          role="region"
          aria-roledescription={t.profile.stripRole}
          aria-label={t.profile.stripLabel(label)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              goTo(active + (e.key === "ArrowRight" ? 1 : -1));
            }
          }}
          className="snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-sm bg-[#1b1310] py-7 [scrollbar-width:none] sm:py-8"
          style={{
            // Perforations en haut et en bas de la bande
            backgroundImage:
              "radial-gradient(circle at center, var(--color-velvet-950) 0 3.2px, transparent 3.6px), radial-gradient(circle at center, var(--color-velvet-950) 0 3.2px, transparent 3.6px)",
            backgroundSize: "18px 12px, 18px 12px",
            backgroundPosition: "0 7px, 0 calc(100% - 7px)",
            backgroundRepeat: "repeat-x",
          }}
        >
          <ol className="flex w-max gap-2 px-[calc(50vw-8rem)] sm:gap-3 sm:px-[calc(50%-10rem)]">
            {frames.map((f, i) => {
              const src = backdropUrl(f.backdropPath, "w780") ?? posterUrl(f.posterPath, "w342");
              const isActive = i === active;
              return (
                <li
                  key={f.id}
                  ref={(el) => {
                    frameRefs.current[i] = el;
                  }}
                  data-index={i}
                  className="relative w-64 shrink-0 snap-center sm:w-80"
                >
                  <Link
                    href={`/film/${f.tmdbId}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={(e) => {
                      // Une image hors de la fenêtre est d'abord amenée au centre.
                      if (!isActive) {
                        e.preventDefault();
                        goTo(i);
                      }
                    }}
                    aria-label={t.film.detailsOf(f.title)}
                    className="group relative block aspect-[3/2] overflow-hidden rounded-[3px] bg-black"
                  >
                    {src && (
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="320px"
                        className={`object-cover transition-[filter,transform] duration-700 ease-out motion-reduce:filter-none ${
                          isActive ? "scale-100" : "scale-[1.03] [filter:invert(1)_sepia(0.35)_saturate(1.6)_hue-rotate(180deg)_brightness(0.9)]"
                        }`}
                      />
                    )}
                    {/* Masque orangé du négatif couleur */}
                    <span
                      className={`absolute inset-0 bg-[#c7602a] mix-blend-multiply transition-opacity duration-700 motion-reduce:opacity-0 ${
                        isActive ? "opacity-0" : "opacity-60"
                      }`}
                    />
                    {isActive && (
                      <span className="absolute right-2 bottom-2 grid size-7 place-items-center rounded-full bg-velvet-950/80 text-screen opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                        <ArrowRightIcon className="size-3.5" />
                      </span>
                    )}
                  </Link>
                  {/* Marquages du bord de pellicule */}
                  <span className="absolute -top-6 left-1 font-mono text-[9px] tracking-[0.2em] text-[#d98b4c]/70 sm:-top-7">
                    WN 35 · {String(i + 1).padStart(2, "0")}A
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        {/* Fenêtre de projection : repère discret au centre */}
        <span className="pointer-events-none absolute inset-y-3 left-1/2 w-[calc(16rem+10px)] -translate-x-1/2 rounded-sm border border-tungsten/30 sm:w-[calc(20rem+12px)]" />
      </div>

      {current && (
        <p className="mt-3 flex flex-wrap items-baseline justify-center gap-x-2 text-center" aria-live="polite">
          <span className="font-semibold">{current.title}</span>
          <span className="meta">
            {[current.year, current.rating != null ? `${formatRating(current.rating, locale)}★` : null, current.liked ? "♥" : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </p>
      )}
      <div className="mt-2 flex justify-center gap-2">
        <button onClick={() => goTo(active - 1)} disabled={active === 0} className="btn-quiet px-3 py-1.5 text-xs" aria-label={t.profile.prevImage}>
          ←
        </button>
        <span className="meta self-center text-[11px]">
          {active + 1} / {frames.length}
        </span>
        <button
          onClick={() => goTo(active + 1)}
          disabled={active === frames.length - 1}
          className="btn-quiet px-3 py-1.5 text-xs"
          aria-label={t.profile.nextImage}
        >
          →
        </button>
      </div>
    </div>
  );
}
