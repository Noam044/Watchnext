import { logoutAction } from "@/actions/auth";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/nav-links";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="relative z-10 flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-ink-800/80 bg-ink-950/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Logo href="/dashboard" />
          <NavLinks />
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden max-w-40 truncate text-sm text-ink-400 md:block">{user.name ?? user.email}</span>
            <form action={logoutAction}>
              <button className="rounded-full px-3 py-1.5 text-sm text-ink-300 transition hover:bg-ink-800 hover:text-ink-100">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl px-4 pb-2 sm:hidden">
          <NavLinks mobile />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
