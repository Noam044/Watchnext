import { getI18n } from "@/i18n/server";

/** Squelette de la page Amis. */
export default async function Loading() {
  const { t } = await getI18n();
  return (
    <div className="space-y-12" aria-busy="true" aria-label={t.friends.loading}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        {/* Comme la page : titre centré sur téléphone. */}
        <div className="flex flex-col gap-3 max-sm:items-center">
          <div className="skeleton h-16 w-48" />
          <div className="skeleton h-4 w-72 max-w-full" />
        </div>
        <div className="skeleton h-13 w-full lg:max-w-sm" />
      </div>
      <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="space-y-3">
            <div className="skeleton aspect-[2.39/1]" />
            <div className="flex items-center gap-3 px-3">
              <div className="skeleton size-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-3 w-48" />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <ul className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="skeleton h-28 rounded-sm" />
        ))}
      </ul>
    </div>
  );
}
