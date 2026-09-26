import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";
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
import { localizeFilms } from "@/lib/film-locale";
import { emblemCandidates } from "@/lib/profile";
import { WATCH_REGIONS, isWatchRegion } from "@/lib/providers";
import { providerCatalog } from "@/lib/streaming";
import { vapidPublicKey } from "@/lib/push";
import { PushToggle } from "@/components/push-toggle";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.settings.meta };
}

const SECTIONS = [
  { id: "profil", key: "sectionProfile" },
  { id: "film-fetiche", key: "sectionEmblem" },
  { id: "plateformes", key: "sectionPlatforms" },
  { id: "notifications", key: "sectionNotifications" },
  { id: "email", key: "sectionEmail" },
  { id: "mot-de-passe", key: "sectionPassword" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/**
 * Réglages découpés en sous-parties (?section=…), une seule affichée à la fois.
 * Téléphone : la liste des réglages, puis la sous-partie choisie avec un retour.
 * Écran large : le menu à gauche et la sous-partie choisie (le profil par défaut) à droite.
 */
export default async function EditProfilePage({ searchParams }: PageProps<"/profile/edit">) {
  const me = await requireUser();
  const { t, locale } = await getI18n();
  const s = t.settings;
  const requested = (await searchParams).section;
  const active = SECTIONS.find((sec) => sec.id === requested)?.id ?? null;
  const shown: SectionId = active ?? "profil";
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
        emblemFilm: { select: { title: true, titleEn: true } },
      },
    }),
    // Seules les données de la sous-partie affichée sont chargées.
    shown === "film-fetiche" ? emblemCandidates(me.id) : [],
  ]);
  localizeFilms(user, locale);

  // Plateformes du pays : les plus répandues, plus celles déjà choisies qui n'y figureraient pas.
  const region = isWatchRegion(user.watchRegion) ? user.watchRegion : "FR";
  const allProviders = shown === "plateformes" ? await providerCatalog(region) : [];
  const platforms = [
    ...allProviders.slice(0, 36),
    ...allProviders.slice(36).filter((p) => user.streamingProviders.includes(p.id)),
  ];
  const regionNames = new Intl.DisplayNames(INTL[locale], { type: "region" });
  const regions = WATCH_REGIONS.map((code): [string, string] => [code, regionNames.of(code) ?? code]).sort((a, b) =>
    a[1].localeCompare(b[1], INTL[locale]),
  );

  localizeFilms(candidates, locale);
  // Le film fétiche actuel reste proposé même s'il ne fait plus partie des mieux notés.
  const options = candidates.map((c) => ({
    filmId: c.filmId,
    title: c.film.title,
    year: c.film.year,
    backdropPath: c.film.backdropPath,
    rating: c.rating,
  }));
  if (user.emblemFilmId && !options.some((o) => o.filmId === user.emblemFilmId)) {
    const film = localizeFilms(await prisma.film.findUnique({ where: { id: user.emblemFilmId } }), locale);
    if (film)
      options.unshift({
        filmId: film.id,
        title: film.title,
        year: film.year,
        backdropPath: film.backdropPath,
        rating: null,
      });
  }

  // Résumé de chaque réglage dans la liste (téléphone).
  const summaries: Record<SectionId, string> = {
    profil: `@${user.handle}`,
    "film-fetiche": user.emblemFilm?.title ?? s.emblemPickedAuto,
    plateformes: s.platformsCount(user.streamingProviders.length),
    notifications: s.notificationsSummary,
    email: user.email,
    "mot-de-passe": s.passwordSummary,
  };

  const content: Record<SectionId, () => React.ReactNode> = {
    profil: () => (
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
    ),
    "film-fetiche": () => (
      <Section id="film-fetiche" title={s.sectionEmblem} hint={s.sectionEmblemHint}>
        <EmblemPicker options={options} selected={user.emblemFilmId} />
      </Section>
    ),
    plateformes: () => (
      <Section id="plateformes" title={s.sectionPlatforms} hint={s.sectionPlatformsHint}>
        <StreamingForm region={region} regions={regions} catalog={platforms} selected={user.streamingProviders} />
      </Section>
    ),
    notifications: () => (
      <Section id="notifications" title={s.sectionNotifications} hint={s.sectionNotificationsHint}>
        <PushToggle publicKey={vapidPublicKey()} />
      </Section>
    ),
    email: () => (
      <Section id="email" title={s.sectionEmail} hint={s.sectionEmailHint}>
        <EmailForm email={user.email} />
      </Section>
    ),
    "mot-de-passe": () => (
      <Section id="mot-de-passe" title={s.sectionPassword}>
        <PasswordForm />
      </Section>
    ),
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[14rem_1fr] lg:gap-10">
      {/* Menu : la liste complète sur téléphone (masquée une fois un réglage ouvert), le sommaire sur écran large. */}
      <aside className={`lg:sticky lg:top-24 lg:self-start ${active ? "max-lg:hidden" : ""}`}>
        <h1 className="marquee text-5xl max-lg:text-center">{s.title}</h1>
        <p className="mt-3 max-lg:text-center">
          <Link href={`/u/${user.handle}`} className="meta inline-flex items-center gap-1 hover:text-screen">
            {s.viewProfile} <ArrowRightIcon className="size-3.5" />
          </Link>
        </p>
        <nav aria-label={s.sections} className="mt-7 lg:mt-8">
          <ul className="overflow-hidden rounded-lg border border-velvet-800 max-lg:divide-y max-lg:divide-velvet-800 lg:rounded-none lg:border-0 lg:border-l">
            {SECTIONS.map((sec) => {
              const current = shown === sec.id;
              return (
                <li key={sec.id}>
                  <Link
                    href={`/profile/edit?section=${sec.id}`}
                    aria-current={current ? "page" : undefined}
                    className={`flex items-center gap-3 px-4 py-3.5 transition max-lg:bg-velvet-900 max-lg:hover:bg-velvet-850 lg:-ml-px lg:border-l lg:py-1.5 ${
                      current
                        ? "lg:border-tungsten lg:text-screen"
                        : "lg:border-transparent lg:text-dust-300 lg:hover:border-velvet-600 lg:hover:text-screen"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{s[sec.key]}</span>
                      <span className="block truncate text-xs text-dust-400 lg:hidden">{summaries[sec.id]}</span>
                    </span>
                    <ArrowRightIcon className="size-4 shrink-0 text-dust-400 lg:hidden" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Réglage affiché : caché sur téléphone tant qu'aucun n'est choisi dans la liste. */}
      <div className={`min-w-0 ${active ? "" : "max-lg:hidden"}`}>
        <Link href="/profile/edit" className="btn-quiet mb-4 -ml-3 lg:hidden">
          <ArrowLeftIcon className="size-4" /> {s.allSettings}
        </Link>
        {content[shown]()}
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
