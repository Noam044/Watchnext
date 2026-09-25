"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";

/** Marque : un écran Cinémascope allumé, et le nom en lettres de marquise. */
export function Logo({ href = "/" }: { href?: string }) {
  const { t } = useI18n();
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label={t.common.homeLabel}>
      <svg viewBox="0 0 30 18" className="h-[18px] w-[30px]" aria-hidden>
        <rect x="1" y="1" width="28" height="11.7" rx="1.5" className="fill-tungsten transition group-hover:fill-tungsten-strong" />
        <path d="M6 17 15 12.7 24 17" className="fill-none stroke-tungsten/40" strokeWidth="1.2" />
      </svg>
      <span className="marquee text-[1.45rem] tracking-[0.04em]">
        Watch<span className="text-tungsten">next</span>
      </span>
    </Link>
  );
}
