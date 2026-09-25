import Link from "next/link";
import { Logo } from "@/components/logo";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const e = (await getI18n()).t.errorsPage;
  return (
    <main id="contenu" tabIndex={-1} className="relative outline-none z-10 flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Logo />
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
    </main>
  );
}
