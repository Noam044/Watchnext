import { Logo } from "@/components/logo";
import { NotFoundScreen } from "@/components/not-found-screen";

/** Adresse inconnue, hors de l'app : la page porte son propre logo. */
export default function NotFound() {
  return (
    <main id="contenu" tabIndex={-1} className="relative outline-none z-10 flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Logo />
      <NotFoundScreen />
    </main>
  );
}
