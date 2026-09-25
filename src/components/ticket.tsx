import Link from "next/link";
import { HeartIcon } from "@/components/icons";
import { Poster } from "@/components/poster";
import { Stars } from "@/components/stars";
import type { Locale } from "@/i18n/config";
import { dateFormat } from "@/i18n/format";

/**
 * Ticket de séance : un visionnage, avec sa date imprimée sur le talon.
 * Les dates du journal Letterboxd sont des jours (minuit UTC) : on les lit en UTC.
 */
export function Ticket({
  date,
  locale,
  undated,
  className = "",
  children,
}: {
  date: Date | null;
  locale: Locale;
  /** Mention du talon quand la date du visionnage est inconnue. */
  undated: string;
  className?: string;
  children: React.ReactNode;
}) {
  const part = (options: Intl.DateTimeFormatOptions) =>
    date ? dateFormat(locale, { ...options, timeZone: "UTC" }).format(date) : "";
  return (
    <div className={`ticket flex min-h-28 ${className}`}>
      <div className="ticket-stub" aria-hidden={!date}>
        {date ? (
          <time dateTime={date.toISOString().slice(0, 10)} className="flex flex-col items-center">
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase opacity-70">
              {part({ month: "short" }).replace(".", "")}
            </span>
            <span className="font-display text-4xl leading-[0.95] font-extrabold">{part({ day: "numeric" })}</span>
            <span className="font-mono text-[10px] opacity-70">{part({ year: "numeric" })}</span>
          </time>
        ) : (
          <span className="font-mono text-[10px] leading-tight uppercase opacity-70">{undated}</span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 gap-3.5 p-3.5 pl-4">{children}</div>
    </div>
  );
}

/** Affiche miniature et note d'un visionnage, à placer dans un ticket. */
export function TicketFilm({
  tmdbId,
  title,
  year,
  posterPath,
  rating,
  liked,
  likedLabel,
  kicker,
  children,
}: {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  rating: number | null;
  liked: boolean;
  likedLabel: string;
  /** Ligne au-dessus du titre (ex. qui a vu le film). */
  kicker?: React.ReactNode;
  /** Lignes ajoutées sous la note (critique…). */
  children?: React.ReactNode;
}) {
  return (
    <>
      <Link href={`/film/${tmdbId}`} className="shrink-0 self-start" tabIndex={-1} aria-hidden>
        <Poster path={posterPath} title={title} size="w185" sizes="56px" className="w-14" />
      </Link>
      <div className="min-w-0 flex-1">
        {kicker && <div className="mb-1 text-xs text-dust-400">{kicker}</div>}
        <p className="leading-snug">
          <Link href={`/film/${tmdbId}`} className="font-semibold hover:text-tungsten">
            {title}
          </Link>
          {year && <span className="meta ml-1.5 text-dust-400">{year}</span>}
        </p>
        {(rating != null || liked) && (
          <p className="mt-1 flex items-center gap-2 text-sm">
            {rating != null && <Stars value={rating} />}
            {liked && (
              <>
                <HeartIcon className="size-3.5 text-curtain brightness-150" />
                <span className="sr-only">{likedLabel}</span>
              </>
            )}
          </p>
        )}
        {children}
      </div>
    </>
  );
}
