import Image from "next/image";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/session";
import { filmOfTheDay, getShowcaseFilms } from "@/lib/showcase";
import { backdropUrl } from "@/lib/tmdb-images";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  if (await getCurrentUser()) redirect("/dashboard");
  const film = filmOfTheDay(await getShowcaseFilms());
  const src = backdropUrl(film?.backdropPath, "w1280");

  return (
    <div className="relative z-10 flex flex-1 flex-col">
      {src && (
        <div className="fixed inset-0 -z-10" aria-hidden>
          <Image src={src} alt="" fill sizes="100vw" className="animate-projector object-cover opacity-55" preload />
          <div className="absolute inset-0 bg-linear-to-t from-velvet-950 via-velvet-950/60 to-velvet-950/20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--color-velvet-950))]" />
        </div>
      )}
      <main id="contenu" tabIndex={-1} className="flex flex-1 outline-none flex-col items-center justify-center px-4 py-12">
        <div className="mb-8">
          <Logo />
        </div>
        <div className="w-full max-w-sm rounded-2xl border border-velvet-700/70 bg-velvet-900/85 p-6 shadow-2xl shadow-black/60 backdrop-blur-md sm:p-8">
          {children}
        </div>
      </main>
      {film && (
        <p className="meta px-4 pb-5 text-center text-[11px] text-dust-400">
          À l&apos;écran : {film.title}
          {film.year ? ` (${film.year})` : ""}
        </p>
      )}
    </div>
  );
}
