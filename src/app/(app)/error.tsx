"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RefreshIcon } from "@/components/icons";

/** Erreur inattendue dans une page connectée : on garde la navigation et on propose de réessayer. */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 py-10 text-center">
      <div className="screen-glow grid aspect-[2.39/1] w-full place-items-center rounded-md bg-black">
        <p className="marquee text-5xl text-screen/70 sm:text-6xl">Bobine cassée</p>
      </div>
      <div>
        <h1 className="marquee text-3xl">La page n&apos;a pas pu se charger</h1>
        <p className="mt-2 text-sm text-dust-300">
          Le serveur a rencontré une erreur. Réessaie ; si ça recommence, vérifie que la base de données tourne.
        </p>
        {error.digest && <p className="meta mt-2 text-[11px] text-dust-400">Référence : {error.digest}</p>}
      </div>
      <div className="flex gap-2">
        <button onClick={() => retry()} className="btn-primary">
          <RefreshIcon /> Réessayer
        </button>
        <Link href="/dashboard" className="btn-ghost">
          Retour à mes films
        </Link>
      </div>
    </div>
  );
}
