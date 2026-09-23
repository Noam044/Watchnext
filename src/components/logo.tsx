import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2" aria-label="Watchnext, accueil">
      <span className="relative grid size-8 place-items-center rounded-lg bg-accent text-ink-950">
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
          <path d="M8 5.5v13l10.5-6.5L8 5.5Z" />
        </svg>
      </span>
      <span className="font-display text-2xl leading-none tracking-tight">Watchnext</span>
    </Link>
  );
}
