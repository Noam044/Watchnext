import Image from "next/image";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { LocaleSwitch } from "@/components/locale-switch";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/session";
import { filmOfTheDay, getShowcaseFilms } from "@/lib/showcase";
import { backdropUrl } from "@/lib/tmdb-images";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { t, locale } = await getI18n();
  const films = await getShowcaseFilms(locale);
  const film = filmOfTheDay(films);
  const src = backdropUrl(film?.backdropPath, "w1280");

  return (
    <div className="relative z-10 flex flex-1 flex-col">
      <LocaleSwitch className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 z-20 bg-velvet-950/60 backdrop-blur" />
      {src && (
        <div className="fixed inset-0 -z-10" aria-hidden>
          <Image src={src} alt="" fill sizes="100vw" className="animate-projector object-cover opacity-55" preload />
          <div className="absolute inset-0 bg-linear-to-t from-velvet-950 via-velvet-950/60 to-velvet-950/20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--color-velvet-950))]" />
        </div>
      )}
      <main
        id="contenu"
        tabIndex={-1}
        className="flex flex-1 flex-col items-center justify-center px-4 pt-[calc(3rem+env(safe-area-inset-top))] pb-12 outline-none"
      >
        <div className="mb-8">
          <Logo />
        </div>
        <div className="w-full max-w-sm rounded-lg border border-velvet-700/70 bg-velvet-900/85 p-6 shadow-2xl shadow-black/60 backdrop-blur-md sm:p-8">
          {children}
        </div>
      </main>
      {film && (
        <p className="meta px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-center text-[11px] text-dust-400">
          {t.auth.onScreen} {film.title}
          {film.year ? ` (${film.year})` : ""}
        </p>
      )}
    </div>
  );
}
