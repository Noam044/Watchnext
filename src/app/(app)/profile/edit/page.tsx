import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { EmailForm, EmblemPicker, PasswordForm, ProfileForm } from "@/components/settings-forms";
import { prisma } from "@/lib/db";
import { emblemCandidates } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Modifier le profil" };

const SECTIONS = [
  { id: "profil", label: "Profil public" },
  { id: "film-fetiche", label: "Film fétiche" },
  { id: "email", label: "Adresse email" },
  { id: "mot-de-passe", label: "Mot de passe" },
];

export default async function EditProfilePage() {
  const me = await requireUser();
  const [user, candidates] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: me.id },
      select: { name: true, handle: true, bio: true, email: true, publicProfile: true, emblemFilmId: true, letterboxd: true },
    }),
    emblemCandidates(me.id),
  ]);

  // Le film fétiche actuel reste proposé même s'il ne fait plus partie des mieux notés.
  const options = candidates.map((c) => ({
    filmId: c.filmId,
    title: c.film.title,
    year: c.film.year,
    backdropPath: c.film.backdropPath,
    rating: c.rating,
  }));
  if (user.emblemFilmId && !options.some((o) => o.filmId === user.emblemFilmId)) {
    const film = await prisma.film.findUnique({ where: { id: user.emblemFilmId } });
    if (film) options.unshift({ filmId: film.id, title: film.title, year: film.year, backdropPath: film.backdropPath, rating: null });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[13rem_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="eyebrow">Réglages</p>
        <h1 className="marquee mt-1 text-5xl">Ton profil</h1>
        <Link href={`/u/${user.handle}`} className="meta mt-3 inline-flex items-center gap-1 hover:text-screen">
          Voir mon profil <ArrowRightIcon className="size-3.5" />
        </Link>
        <nav aria-label="Sections" className="mt-8 hidden flex-col gap-1 border-l border-velvet-800 lg:flex">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="-ml-px border-l border-transparent py-1 pl-4 text-sm text-dust-300 hover:border-tungsten hover:text-screen">
              {s.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 space-y-6">
        <Section id="profil" title="Profil public" hint="Ce que voient les autres membres de Watchnext.">
          <ProfileForm
            defaults={{
              name: user.name ?? "",
              handle: user.handle,
              bio: user.bio ?? "",
              letterboxd: user.letterboxd?.username ?? "",
              publicProfile: user.publicProfile,
            }}
          />
        </Section>
        <Section id="film-fetiche" title="Film fétiche" hint="Son image devient la bannière de ton profil. Choisis parmi tes films les mieux notés.">
          <EmblemPicker options={options} selected={user.emblemFilmId} />
        </Section>
        <Section id="email" title="Adresse email" hint="Elle sert à te connecter et n'est jamais affichée.">
          <EmailForm email={user.email} />
        </Section>
        <Section id="mot-de-passe" title="Mot de passe">
          <PasswordForm />
        </Section>
      </div>
    </div>
  );
}

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="card scroll-mt-24 p-5 sm:p-7">
      <h2 id={`${id}-title`} className="marquee text-3xl">
        {title}
      </h2>
      {hint && <p className="mt-1 mb-5 text-sm text-dust-300">{hint}</p>}
      {!hint && <div className="mb-5" />}
      {children}
    </section>
  );
}
