import Link from "next/link";
import { redirect } from "next/navigation";
import { CutReveal } from "@/components/cut-reveal";
import { ExpandingScreen } from "@/components/expanding-screen";
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

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 sm:px-6 sm:pt-14">
        <div className="max-w-4xl">
          <p className="eyebrow animate-rise">Recommandations de films pour Letterboxd</p>
          <h1 className="marquee mt-4 text-[3.4rem] text-balance sm:text-8xl lg:text-[7.5rem]">
            <CutReveal text="Ton prochain film préféré est" delay={150} stagger={18} />{" "}
            <CutReveal text="déjà dans tes notes." delay={150 + 25 * 18} stagger={18} className="text-tungsten" />
          </h1>
          <p className="mt-6 max-w-xl animate-rise text-lg leading-relaxed text-dust-300 [animation-delay:700ms]">
            Watchnext lit ce que tu as vu et noté sur Letterboxd et te propose des films qui te ressemblent, chacun avec
            sa raison.
          </p>
          <div className="mt-8 flex animate-rise flex-wrap gap-3 [animation-delay:850ms]">
            <Link href="/register" className="btn-primary px-7 py-3.5 text-base">
              Créer mon compte
            </Link>
            <Link href="/login" className="btn-ghost px-7 py-3.5 text-base">
              J&apos;ai déjà un compte
            </Link>
          </div>
        </div>

      </main>

      {films.length > 0 && (
        <div className="mt-16 sm:mt-20">
          <ExpandingScreen
            caption={
              <div>
                <p className="marquee text-5xl text-screen [text-shadow:0_2px_30px_rgb(0_0_0/0.9)] sm:text-7xl lg:text-8xl">La salle s&apos;éteint.</p>
                <p className="mt-3 text-base text-screen/90 [text-shadow:0_1px_12px_rgb(0_0_0/0.9)] sm:text-lg">
                  Parmi tous ces films, lequel est fait pour toi ?
                </p>
                <Link href="/register" className="btn-primary mt-6 px-7 py-3.5 text-base">
                  Trouver mon film
                </Link>
              </div>
            }
          >
            <div className="absolute inset-0 flex flex-col justify-center gap-[3%] py-[2%]">
              <PosterRow films={films.slice(0, half)} />
              <PosterRow films={films.slice(half)} reverse />
            </div>
          </ExpandingScreen>
          <p className="meta mx-auto mt-3 w-full max-w-6xl px-4 text-right text-[11px] text-dust-400 sm:px-6">
            À l&apos;affiche cette semaine · données TMDB
          </p>
        </div>
      )}

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <ol className="mt-20 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-t border-velvet-700 pt-5">
              <span className="font-mono text-sm text-tungsten">Étape {i + 1}</span>
              <h2 className="marquee mt-2 text-3xl">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-dust-300">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

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
    <div
      className="flex h-[44%] w-max gap-3 motion-safe:animate-[reel_90s_linear_infinite] sm:gap-4"
      style={reverse ? { animationDirection: "reverse" } : undefined}
    >
      {[...films, ...films].map((f, i) => (
        <Poster
          key={`${f.tmdbId}-${i}`}
          path={f.posterPath}
          title={f.title}
          size="w342"
          sizes="(max-width: 640px) 160px, 320px"
          className="h-full w-auto shrink-0 opacity-85"
        />
      ))}
    </div>
  );
}
