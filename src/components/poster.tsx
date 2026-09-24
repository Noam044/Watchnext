import Image from "next/image";
import { posterUrl } from "@/lib/tmdb-images";

export function Poster({
  path,
  title,
  size = "w342",
  className = "",
  preload = false,
  sizes = "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px",
}: {
  path: string | null;
  title: string;
  size?: "w185" | "w342" | "w500";
  className?: string;
  preload?: boolean;
  sizes?: string;
}) {
  const url = posterUrl(path, size);
  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-[5px] bg-velvet-800 ${className}`}>
      {url ? (
        <Image src={url} alt={`Affiche de ${title}`} fill sizes={sizes} className="object-cover" preload={preload} />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-3 text-center">
          <span className="marquee text-lg text-dust-300">{title}</span>
        </div>
      )}
    </div>
  );
}
