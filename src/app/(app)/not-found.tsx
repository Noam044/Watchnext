import { NotFoundScreen } from "@/components/not-found-screen";

/** Film, profil ou conversation introuvable : l'en-tête de l'app reste, sans second logo. */
export default function AppNotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 py-10 text-center">
      <NotFoundScreen />
    </div>
  );
}
