"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Recommandations" },
  { href: "/import", label: "Importer" },
] as const;

export function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={mobile ? "flex w-full gap-1" : "ml-4 hidden gap-1 sm:flex"}>
      {LINKS.map((l) => {
        const active = pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-full px-3.5 py-1.5 text-sm transition ${mobile ? "flex-1 text-center" : ""} ${
              active ? "bg-ink-800 text-ink-100" : "text-ink-400 hover:text-ink-100"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
