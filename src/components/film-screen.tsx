"use client";

import { Suspense, ViewTransition, use, useCallback, useState } from "react";
import { ScopeScreen } from "@/components/scope-screen";
import { PlayOverlay, TrailerFrame } from "@/components/trailer";

/** Écran de la fiche film : l'image de fond, et la bande-annonce qui s'y joue au clic. */
export function FilmScreen({
  backdropPath,
  posterPath,
  tmdbId,
  title,
  trailerKey,
}: {
  backdropPath: string | null;
  posterPath: string | null;
  tmdbId: number;
  title: string;
  /** Clé YouTube envoyée par le serveur après la page (null : aucune bande-annonce). */
  trailerKey: Promise<string | null>;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  const close = useCallback(() => setPlaying(null), []);

  if (playing) {
    return (
      // Marge basse : l'affiche, qui remonte d'habitude sur l'écran, reste sous la vidéo.
      <div className="-mx-4 pb-16 sm:mx-0 sm:pb-24">
        <TrailerFrame videoKey={playing} title={title} onClose={close} />
      </div>
    );
  }
  return (
    // Même nom que l'écran de « Ta séance » : l'image s'y transforme en arrivant ici.
    <ViewTransition name={`screen-${tmdbId}`} share="morph" default="none">
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
        {/* Le bouton lecture apparaît quand la bande-annonce est connue, sans retarder la fiche. */}
        <Suspense fallback={null}>
          <TrailerButton trailerKey={trailerKey} onPlay={setPlaying} />
        </Suspense>
      </ScopeScreen>
    </ViewTransition>
  );
}

function TrailerButton({ trailerKey, onPlay }: { trailerKey: Promise<string | null>; onPlay: (key: string) => void }) {
  const key = use(trailerKey);
  return key ? <PlayOverlay onPlay={() => onPlay(key)} /> : null;
}
