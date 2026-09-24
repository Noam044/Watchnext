import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { Poster } from "@/components/poster";
import { getCurrentUser } from "@/lib/session";
import { getShowcaseFilms, type ShowcaseFilm } from "@/lib/showcase";

const STEPS = [
  {
    title: "Importe ton Letterboxd",
    text: "Ton pseudo suffit pour tes derniers films via le flux RSS public. Dépose ton export pour tout ton historique.",
  },
  {
    title: "Watchnext cerne tes goûts",
    text: "Genres, réalisateurs, acteurs, thèmes et décennies, pondérés par tes notes. Les films que tu as détestés comptent aussi.",
  },
  {
    title: "Tu sais quoi regarder ce soir",
    text: "Chaque film proposé dit pourquoi : « Parce que tu as aimé X et Y ». Compare aussi tes goûts avec ceux de tes amis.",
  },
];

export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");
  const films = await getShowcaseFilms();
  const half = Math.ceil(films.length / 2);

  return (
    <div className="relative z-10 flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Link href="/login" className="btn-quiet">
          Se connecter
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-20 sm:px-6 sm:pt-14">
        <div className="max-w-4xl animate-rise">
          <p className="eyebrow">Recommandations de films pour Letterboxd</p>
          <h1 className="marquee mt-4 text-[3.4rem] text-balance sm:text-8xl lg:text-[7.5rem]">
            Ton prochain film préféré est <span className="text-tungsten">déjà dans tes notes.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-dust-300">
            Watchnext lit ce que tu as vu et noté sur Letterboxd et te propose des films qui te ressemblent, chacun avec
            sa raison.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary px-7 py-3.5 text-base">
              Créer mon compte
            </Link>
            <Link href="/login" className="btn-ghost px-7 py-3.5 text-base">
              J&apos;ai déjà un compte
            </Link>
          </div>
        </div>

        {films.length > 0 && (
          <div className="relative mt-16 sm:mt-20">
            <div className="screen-glow relative aspect-[4/3] animate-projector overflow-hidden rounded-md bg-black sm:aspect-[2.39/1]">
              <div className="absolute inset-0 flex flex-col justify-center gap-3 py-3 sm:gap-4">
                <PosterRow films={films.slice(0, half)} />
                <PosterRow films={films.slice(half)} reverse />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgb(0_0_0/0.7))]" />
            </div>
            <p className="meta mt-3 text-right text-[11px] text-dust-400">À l&apos;affiche cette semaine · données TMDB</p>
          </div>
        )}

        <ol className="mt-20 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-t border-velvet-700 pt-5">
              <span className="font-mono text-sm text-tungsten">Étape {i + 1}</span>
              <h2 className="marquee mt-2 text-3xl">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-dust-300">{s.text}</p>
            </li>
          ))}
        </ol>
      </main>

      <footer className="mx-auto w-full max-w-6xl border-t border-velvet-800 px-4 py-8 text-xs text-dust-400 sm:px-6">
        Données de films fournies par TMDB. Ce produit utilise l&apos;API TMDB sans être approuvé ni certifié par TMDB.
        Watchnext n&apos;est pas affilié à Letterboxd.
      </footer>
    </div>
  );
}

/** Rangée d'affiches qui défile en boucle (la liste est doublée pour un raccord invisible). */
function PosterRow({ films, reverse = false }: { films: ShowcaseFilm[]; reverse?: boolean }) {
  return (
    <div className="flex w-max gap-3 motion-safe:animate-[reel_90s_linear_infinite] sm:gap-4" style={reverse ? { animationDirection: "reverse" } : undefined}>
      {[...films, ...films].map((f, i) => (
        <Poster
          key={`${f.tmdbId}-${i}`}
          path={f.posterPath}
          title={f.title}
          size="w185"
          sizes="150px"
          className="w-24 shrink-0 opacity-85 sm:w-32 lg:w-36"
        />
      ))}
    </div>
  );
}
