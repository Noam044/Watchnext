import Image from "next/image";
import { distinctProviders, type ProviderInfo } from "@/lib/providers";

/**
 * Logos des plateformes où voir un film. Celles auxquelles l'utilisateur est abonné
 * passent en premier, cerclées d'ambre ; la formule avec publicité d'une plateforme n'a pas son propre logo.
 */
export function ProviderLogos({
  providers,
  mine = [],
  size = 24,
  max = 4,
  className = "",
}: {
  providers: ProviderInfo[];
  mine?: number[];
  size?: number;
  max?: number;
  className?: string;
}) {
  if (providers.length === 0) return null;
  const sorted = distinctProviders(
    [...providers].sort((a, b) => Number(mine.includes(b.id)) - Number(mine.includes(a.id))),
  );
  const shown = sorted.slice(0, max);
  const more = sorted.length - shown.length;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {shown.map((p) => (
        <span
          key={p.id}
          title={p.name}
          className={`relative shrink-0 overflow-hidden rounded-[5px] ${mine.includes(p.id) ? "ring-2 ring-tungsten" : "ring-1 ring-white/10"}`}
          style={{ width: size, height: size }}
        >
          {p.logo ? (
            <Image
              src={`https://image.tmdb.org/t/p/w92${p.logo}`}
              alt={p.name}
              width={size}
              height={size}
              className="size-full"
            />
          ) : (
            <span className="grid size-full place-items-center bg-velvet-700 text-[9px] font-bold">
              {p.name.slice(0, 2)}
            </span>
          )}
        </span>
      ))}
      {more > 0 && <span className="meta text-[11px]">+{more}</span>}
    </span>
  );
}
