"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RefreshIcon } from "@/components/icons";
import { useI18n } from "@/i18n/client";

/** Erreur inattendue dans une page connectée : on garde la navigation et on propose de réessayer. */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const e = useI18n().t.errorsPage;
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 py-10 text-center">
      <div className="screen-glow grid aspect-[2.39/1] w-full place-items-center rounded-md bg-black">
        <p className="marquee text-5xl text-screen/70 sm:text-6xl">{e.brokenReel}</p>
      </div>
      <div>
        <h1 className="marquee text-3xl">{e.errorTitle}</h1>
        <p className="mt-2 text-sm text-dust-300">
          {e.errorText}
        </p>
        {error.digest && <p className="meta mt-2 text-[11px] text-dust-400">{e.reference(error.digest)}</p>}
      </div>
      <div className="flex gap-2">
        <button onClick={() => retry()} className="btn-primary">
          <RefreshIcon /> {e.retry}
        </button>
        <Link href="/dashboard" className="btn-ghost">
          {e.backToFilms}
        </Link>
      </div>
    </div>
  );
}
