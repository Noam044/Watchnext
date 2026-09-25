import { getI18n } from "@/i18n/server";

/** Squelette du profil : bannière, identité, statistiques puis affiches. */
export default async function Loading() {
  const { t } = await getI18n();
  return (
    <div className="space-y-12" aria-busy="true" aria-label={t.profile.loading}>
      <div>
        <div className="skeleton -mx-4 aspect-[2.39/1] rounded-none sm:mx-0 sm:rounded-md" />
        <div className="flex items-end gap-4 px-1 sm:px-6">
          <div className="skeleton -mt-12 size-24 shrink-0 rounded-full ring-4 ring-velvet-950 sm:-mt-14 sm:size-28" />
          <div className="flex-1 space-y-2 pb-1">
            <div className="skeleton h-10 w-64 max-w-full" />
            <div className="skeleton h-3 w-48" />
          </div>
        </div>
        <div className="skeleton mt-8 h-20 w-full" />
      </div>
      <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-x-4 md:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <li key={i} className="space-y-2">
            <div className="skeleton aspect-[2/3]" />
            <div className="skeleton h-3 w-3/4" />
          </li>
        ))}
      </ul>
    </div>
  );
}
