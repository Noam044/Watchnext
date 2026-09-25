"use client";

import { useEffect, useRef } from "react";
import { ExternalIcon, PlayIcon, XIcon } from "@/components/icons";
import { useI18n } from "@/i18n/client";

/**
 * Lecteur de bande-annonce : l'écran passe du Cinémascope au 16:9, comme les caches
 * d'une salle qui s'ouvrent, puis la vidéo YouTube démarre. YouTube (domaine sans
 * cookies) n'est chargé qu'à ce moment-là, jamais avant le clic.
 */
export function TrailerFrame({ videoKey, title, onClose }: { videoKey: string; title: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoKey)}?autoplay=1&rel=0&playsinline=1&modestbranding=1&hl=fr&cc_lang_pref=fr`;
  return (
    <div>
      <div className="screen-glow relative aspect-video animate-masking-open overflow-hidden rounded-md bg-black">
        <iframe
          src={src}
          title={t.film.trailerOf(title)}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full animate-[rise_0.6s_0.35s_both]"
        />
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-velvet-950/85 text-screen backdrop-blur transition hover:bg-velvet-800"
          aria-label={t.film.closeTrailer}
        >
          <XIcon />
        </button>
      </div>
      {/* Secours : certaines bandes-annonces interdisent la lecture hors de YouTube. */}
      <a
        href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoKey)}`}
        target="_blank"
        rel="noreferrer"
        className="meta mt-2 inline-flex items-center gap-1 text-[11px] text-dust-400 hover:text-screen"
      >
        {t.film.trailerFallback} <ExternalIcon className="size-3" />
      </a>
    </div>
  );
}

/** Gros bouton ▶ posé au centre d'un écran, qui s'allume au survol. */
export function PlayOverlay({ onPlay, label }: { onPlay: () => void; label?: string }) {
  const { t } = useI18n();
  label ??= t.film.trailer;
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group/play absolute inset-0 z-10 grid place-items-center focus-visible:outline-none"
      aria-label={label}
    >
      <span className="flex items-center gap-3 rounded-full bg-velvet-950/70 py-2 pr-5 pl-2 text-sm font-semibold text-screen ring-1 ring-white/15 backdrop-blur transition duration-300 group-hover/play:scale-105 group-hover/play:bg-tungsten group-hover/play:text-velvet-950 group-focus-visible/play:ring-2 group-focus-visible/play:ring-tungsten">
        <span className="grid size-10 place-items-center rounded-full bg-tungsten text-velvet-950 transition group-hover/play:bg-velvet-950 group-hover/play:text-tungsten">
          <PlayIcon className="size-4 translate-x-px" />
        </span>
        {label}
      </span>
    </button>
  );
}
