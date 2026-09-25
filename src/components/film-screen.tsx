"use client";

import { useCallback, useState } from "react";
import { ScopeScreen } from "@/components/scope-screen";
import { PlayOverlay, TrailerFrame } from "@/components/trailer";

/** Écran de la fiche film : l'image de fond, et la bande-annonce qui s'y joue au clic. */
export function FilmScreen({
  backdropPath,
  posterPath,
  title,
  trailerKey,
}: {
  backdropPath: string | null;
  posterPath: string | null;
  title: string;
  trailerKey: string | null;
}) {
  const [playing, setPlaying] = useState(false);
  const close = useCallback(() => setPlaying(false), []);

  if (playing && trailerKey) {
    return (
      // Marge basse : l'affiche, qui remonte d'habitude sur l'écran, reste sous la vidéo.
      <div className="-mx-4 pb-16 sm:mx-0 sm:pb-24">
        <TrailerFrame videoKey={trailerKey} title={title} onClose={close} />
      </div>
    );
  }
  return (
    <ScopeScreen
      backdropPath={backdropPath}
      posterPath={posterPath}
      alt=""
      preload
      animate
      className="group/screen -mx-4 rounded-none sm:mx-0 sm:rounded-md"
      imageClassName="transition-transform duration-[8s] ease-out group-hover/screen:scale-105"
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-velvet-950/90 via-velvet-950/10 to-transparent" />
      {trailerKey && <PlayOverlay onPlay={() => setPlaying(true)} />}
    </ScopeScreen>
  );
}
