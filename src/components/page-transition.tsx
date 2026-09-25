"use client";

import { usePathname } from "next/navigation";
import { ViewTransition } from "react";

/**
 * Transition entre pages : chaque page a sa propre clé, donc changer de page démonte
 * l'ancienne (la salle s'assombrit) et monte la nouvelle (l'écran se rallume).
 * Les filtres d'une même page (paramètres d'URL) ne déclenchent rien.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="page-in" exit="page-out" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
