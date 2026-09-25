import Link from "next/link";
import { redirect } from "next/navigation";
import { CutReveal } from "@/components/cut-reveal";
import { ExpandingScreen } from "@/components/expanding-screen";
import { Logo } from "@/components/logo";
import { Poster } from "@/components/poster";
import { ScopeScreen } from "@/components/scope-screen";
import { getCurrentUser } from "@/lib/session";
import { getShowcaseFilms, type ShowcaseFilm } from "@/lib/showcase";

const STEPS = [
  {
    title: "Importe ton Letterboxd",
    text: "Ton pseudo suffit pour tes derniers films, via le flux RSS public. Dépose ton export pour tout ton historique.",
  },
  {
    title: "Watchnext cerne tes goûts",
    text: "Genres, réalisateurs, acteurs, thèmes et décennies, pondérés par tes notes. Les films que tu as détestés comptent aussi.",
  },
  {
    title: "Tu choisis ta séance",
    text: "Chaque film proposé dit pourquoi il est là. Compare aussi tes goûts avec ceux de tes amis.",
  },
];

export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");
  const films = await getShowcaseFilms();
  const half = Math.ceil(films.length / 2);
  // Exemple de recommandation construit avec les films à l'affiche (clairement présenté comme un exemple).
  const demo = films.find((f) => f.backdropPath) ?? null;
  const because = films.filter((f) => f !== demo).slice(0, 2);

  return (
    <div className="relative z-10 flex flex-1 flex-col">
      <header className="absolute inset-x-0 top-0 z-20 mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <Link href="/login" className="btn-quiet">
          Se connecter
        </Link>
      </header>

      <main id="contenu" tabIndex={-1} className="outline-none">
        <ExpandingScreen
          intro={
            <div className="max-w-4xl">
              <p className="eyebrow animate-rise text-screen/75 [text-shadow:0_1px_10px_rgb(0_0_0/0.9)]">Recommandations de films pour Letterboxd</p>
              <h1 className="marquee mt-3 text-[2.9rem] text-balance [text-shadow:0_2px_30px_rgb(0_0_0/0.6)] sm:text-7xl lg:text-8xl">
                <CutReveal text="Ton prochain film préféré est" delay={350} stagger={18} />{" "}
                <CutReveal text="déjà dans tes notes." delay={350 + 25 * 18} stagger={18} className="text-tungsten" />
              </h1>
              <p className="mt-4 max-w-xl animate-rise text-base leading-relaxed text-screen/85 [animation-delay:900ms] sm:text-lg">
                Watchnext lit ce que tu as vu et noté sur Letterboxd et te propose des films qui te ressemblent, chacun
                avec sa raison.
              </p>
              <div className="mt-6 flex animate-rise flex-wrap gap-3 [animation-delay:1050ms]">
                <Link href="/register" className="btn-primary px-7 py-3.5 text-base">
                  Créer mon compte
                </Link>
                <Link href="/login" className="btn-ghost bg-velvet-950/40 px-7 py-3.5 text-base backdrop-blur">
                  J&apos;ai déjà un compte
                </Link>
              </div>
            </div>
          }
          caption={
            <div>
              <p className="marquee text-6xl tracking-[0.04em] text-screen [text-shadow:0_2px_30px_rgb(0_0_0/0.9)] sm:text-8xl lg:text-9xl">
                Watch<span className="text-tungsten">next</span>
              </p>
              <p className="mt-3 text-base text-screen/90 [text-shadow:0_1px_12px_rgb(0_0_0/0.9)] sm:text-lg">
                Parmi tous ces films, lequel est fait pour toi ?
              </p>
              <Link href="/register" className="btn-primary mt-6 px-7 py-3.5 text-base">
                Trouver mon film
              </Link>
            </div>
          }
        >
          {films.length > 0 && (
            <>
              <div className="absolute inset-0 flex flex-col justify-start gap-3 pt-24 sm:justify-center sm:gap-[2.5%] sm:py-[2%]">
                <PosterRow films={films.slice(0, half)} />
                <PosterRow films={films.slice(half)} reverse />
              </div>
              <p
                className="meta absolute z-10 text-[10px] text-screen/60"
                style={{ top: "calc(var(--t) * (1 - var(--p)) + 1rem)", right: "calc(var(--x) * (1 - var(--p)) + 1.25rem)" }}
              >
                À l&apos;affiche cette semaine · TMDB
              </p>
            </>
          )}
        </ExpandingScreen>
      </main>

      <section
        aria-labelledby="comment"
        className="mx-auto grid w-full max-w-6xl gap-14 px-4 pt-24 pb-28 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-20"
      >
        <div>
          <p className="eyebrow">Comment ça marche</p>
          <h2 id="comment" className="marquee mt-3 text-5xl text-balance sm:text-6xl">
            Chaque film arrive avec <span className="text-tungsten">sa raison.</span>
          </h2>
          <ol className="relative mt-10 space-y-8 border-l border-velvet-700 pl-8">
            {STEPS.map((s, i) => (
              <li key={s.title} className="reveal relative">
                <span className="absolute top-0 -left-[calc(2rem+0.8rem)] grid size-[1.6rem] place-items-center rounded-full border border-tungsten/50 bg-velvet-950 font-mono text-xs font-bold text-tungsten">
                  {i + 1}
                </span>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-dust-300">{s.text}</p>
              </li>
            ))}
          </ol>
          <Link href="/register" className="btn-primary mt-10 px-7 py-3.5 text-base">
            Créer mon compte
          </Link>
        </div>

        {demo && (
          <figure className="reveal lg:-mr-10">
            <ScopeScreen backdropPath={demo.backdropPath} posterPath={demo.posterPath} alt="" size="w1280" sizes="(max-width: 1024px) 100vw, 680px">
              <div className="absolute inset-0 bg-linear-to-t from-velvet-950/95 via-velvet-950/35 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                <p className="eyebrow text-tungsten">
                  Ta séance · <span className="font-bold">94 %</span> pour toi
                </p>
                <p className="marquee mt-1.5 text-3xl text-balance sm:text-5xl">{demo.title}</p>
                {because.length === 2 && (
                  <p className="mt-2 text-sm text-screen/90 sm:text-base">
                    Parce que tu as aimé {because[0].title} et {because[1].title}
                  </p>
                )}
              </div>
            </ScopeScreen>
            <figcaption className="meta mt-3 flex items-center gap-2 text-[11px] text-dust-400">
              <span className="rounded-sm border border-velvet-700 px-1.5 py-0.5 text-dust-300">Exemple</span>
              Recommandation fictive, composée avec les films à l&apos;affiche cette semaine.
            </figcaption>
          </figure>
        )}
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
      className="flex h-[27%] w-max gap-3 sm:h-[44%] motion-safe:animate-[reel_90s_linear_infinite] sm:gap-4"
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
