import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/session";

const STEPS = [
  {
    n: "01",
    title: "Importe ton Letterboxd",
    text: "Ton pseudo suffit pour un aperçu via le flux RSS public, ou dépose ton export pour tout ton historique.",
  },
  {
    n: "02",
    title: "On cerne tes goûts",
    text: "Genres, réalisateurs, acteurs, thèmes et décennies, pondérés par tes notes. Les films que tu as détestés comptent aussi.",
  },
  {
    n: "03",
    title: "Tu sais quoi regarder",
    text: "Une sélection expliquée : « Parce que tu as aimé X et Y ». Masque, marque comme vu, recalcule quand tu veux.",
  },
];

export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className="relative z-10 flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Link href="/login" className="text-sm text-ink-300 hover:text-ink-100">
          Connexion
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <div className="max-w-3xl">
          <p className="label mb-5">Recommandations de films · Letterboxd</p>
          <h1 className="font-display text-5xl leading-[0.95] sm:text-7xl">
            Ton prochain film préféré est <span className="text-accent italic">déjà dans tes notes.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-300">
            Watchnext analyse ce que tu as vu et noté sur Letterboxd pour te proposer des films qui te ressemblent,
            avec la raison de chaque suggestion.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary px-6 py-3 text-base">
              Commencer gratuitement
            </Link>
            <Link href="/login" className="btn-ghost px-6 py-3 text-base">
              J&apos;ai déjà un compte
            </Link>
          </div>
        </div>

        <ol className="mt-20 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="card p-6">
              <span className="font-display text-3xl text-accent">{s.n}</span>
              <h2 className="mt-3 font-medium">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-400">{s.text}</p>
            </li>
          ))}
        </ol>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 py-8 text-xs text-ink-400 sm:px-6">
        Données de films fournies par TMDB. Ce produit utilise l&apos;API TMDB sans être approuvé ni certifié par TMDB.
        Watchnext n&apos;est pas affilié à Letterboxd.
      </footer>
    </div>
  );
}
