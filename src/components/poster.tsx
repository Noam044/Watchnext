import Image from "next/image";
import { posterUrl } from "@/lib/tmdb-images";

export function Poster({
  path,
  title,
  size = "w342",
  className = "",
  priority = false,
}: {
  path: string | null;
  title: string;
  size?: "w185" | "w342" | "w500";
  className?: string;
  priority?: boolean;
}) {
  const url = posterUrl(path, size);
  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-xl bg-ink-800 ${className}`}>
      {url ? (
        <Image
          src={url}
          alt={`Affiche de ${title}`}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
          className="object-cover"
          priority={priority}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-3 text-center font-display text-lg text-ink-400">
          {title}
        </div>
      )}
    </div>
  );
}
