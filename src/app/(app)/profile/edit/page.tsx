import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import {
  AvatarForm,
  EmailForm,
  EmblemPicker,
  PasswordForm,
  ProfileForm,
  StreamingForm,
} from "@/components/settings-forms";
import { INTL } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { avatarUrl } from "@/lib/avatar";
import { prisma } from "@/lib/db";
import { emblemCandidates } from "@/lib/profile";
import { WATCH_REGIONS, isWatchRegion } from "@/lib/providers";
import { providerCatalog } from "@/lib/streaming";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.settings.meta };
}

const SECTIONS = [
  { id: "profil", key: "sectionProfile" },
  { id: "film-fetiche", key: "sectionEmblem" },
  { id: "plateformes", key: "sectionPlatforms" },
  { id: "email", key: "sectionEmail" },
  { id: "mot-de-passe", key: "sectionPassword" },
] as const;

export default async function EditProfilePage() {
  const me = await requireUser();
  const { t, locale } = await getI18n();
  const s = t.settings;
  const [user, candidates] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: me.id },
      select: {
        id: true,
        name: true,
        handle: true,
        bio: true,
        email: true,
        publicProfile: true,
        emblemFilmId: true,
        avatarAt: true,
        watchRegion: true,
        streamingProviders: true,
        letterboxd: true,
      },
    }),
    emblemCandidates(me.id),
  ]);

  // Plateformes du pays : les plus répandues, plus celles déjà choisies qui n'y figureraient pas.
  const region = isWatchRegion(user.watchRegion) ? user.watchRegion : "FR";
  const allProviders = await providerCatalog(region);
  const platforms = [
    ...allProviders.slice(0, 36),
    ...allProviders.slice(36).filter((p) => user.streamingProviders.includes(p.id)),
  ];
  const regionNames = new Intl.DisplayNames(INTL[locale], { type: "region" });
  const regions = WATCH_REGIONS.map((code): [string, string] => [code, regionNames.of(code) ?? code]).sort((a, b) =>
    a[1].localeCompare(b[1], INTL[locale]),
  );

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
    if (film)
      options.unshift({
        filmId: film.id,
        title: film.title,
        year: film.year,
        backdropPath: film.backdropPath,
        rating: null,
      });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[13rem_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <h1 className="marquee text-5xl">{s.title}</h1>
        <Link href={`/u/${user.handle}`} className="meta mt-3 inline-flex items-center gap-1 hover:text-screen">
          {s.viewProfile} <ArrowRightIcon className="size-3.5" />
        </Link>
        <nav aria-label={s.sections} className="mt-8 hidden flex-col gap-1 border-l border-velvet-800 lg:flex">
          {SECTIONS.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className="-ml-px border-l border-transparent py-1 pl-4 text-sm text-dust-300 hover:border-tungsten hover:text-screen"
            >
              {s[sec.key]}
            </a>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 space-y-6">
        <Section id="profil" title={s.sectionProfile} hint={s.sectionProfileHint}>
          <AvatarForm name={user.name?.trim() || user.handle} handle={user.handle} src={avatarUrl(user)} />
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
        <Section id="film-fetiche" title={s.sectionEmblem} hint={s.sectionEmblemHint}>
          <EmblemPicker options={options} selected={user.emblemFilmId} />
        </Section>
        <Section id="plateformes" title={s.sectionPlatforms} hint={s.sectionPlatformsHint}>
          <StreamingForm region={region} regions={regions} catalog={platforms} selected={user.streamingProviders} />
        </Section>
        <Section id="email" title={s.sectionEmail} hint={s.sectionEmailHint}>
          <EmailForm email={user.email} />
        </Section>
        <Section id="mot-de-passe" title={s.sectionPassword}>
          <PasswordForm />
        </Section>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
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
