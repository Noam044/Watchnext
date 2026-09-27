import Link from "next/link";
import { getI18n } from "@/i18n/server";

/** Écran « 404 » : l'écran de cinéma éteint, un titre et le retour aux films. */
export async function NotFoundScreen() {
  const e = (await getI18n()).t.errorsPage;
  return (
    <>
      <div className="screen-glow grid aspect-[2.39/1] w-full max-w-xl place-items-center rounded-md bg-black">
        <p className="marquee text-7xl text-screen/80 sm:text-8xl">404</p>
      </div>
      <div>
        <h1 className="marquee text-4xl">{e.notFoundTitle}</h1>
        <p className="mt-2 text-sm text-dust-300">{e.notFoundText}</p>
      </div>
      <Link href="/dashboard" className="btn-primary">
        {e.backToFilms}
      </Link>
    </>
  );
}
