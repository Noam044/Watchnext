import Image from "next/image";
import { backdropUrl, posterUrl } from "@/lib/tmdb-images";

/**
 * Écran au format Cinémascope (2.39:1) : l'élément signature de Watchnext.
 * Sert de héros aux recommandations, de bannière au profil et aux cartes d'amis.
 */
export function ScopeScreen({
  backdropPath,
  posterPath,
  alt,
  size = "w1280",
  preload = false,
  animate = false,
  glow = true,
  sizes = "(max-width: 1152px) 100vw, 1152px",
  className = "",
  imageClassName = "",
  children,
}: {
  backdropPath: string | null | undefined;
  /** Repli quand le film n'a pas d'image de fond : l'affiche, floutée. */
  posterPath?: string | null;
  alt: string;
  size?: "w300" | "w780" | "w1280";
  preload?: boolean;
  animate?: boolean;
  glow?: boolean;
  sizes?: string;
  className?: string;
  /** Classes ajoutées à l'image (ex. zoom lent au survol). */
  imageClassName?: string;
  children?: React.ReactNode;
}) {
  const src = backdropUrl(backdropPath, size);
  const fallback = !src ? posterUrl(posterPath, "w342") : null;
  return (
    <div
      className={`relative aspect-[2.39/1] overflow-hidden rounded-md bg-black ${glow ? "screen-glow" : ""} ${className}`}
    >
      <div className={`absolute inset-0 ${animate ? "animate-projector" : ""}`}>
        {src ? (
          <Image src={src} alt={alt} fill sizes={sizes} className={`object-cover ${imageClassName}`} preload={preload} />
        ) : fallback ? (
          <Image src={fallback} alt={alt} fill sizes="400px" className="scale-110 object-cover opacity-60 blur-2xl" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-velvet-700),var(--color-velvet-950))]" />
        )}
        {/* Vignettage de projection */}
        {/* Vignettage de projection : il s'ouvre au survol des écrans cliquables (group/screen). */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(0_0_0/0.55))] transition-opacity duration-700 group-hover/screen:opacity-30" />
      </div>
      {children}
    </div>
  );
}
