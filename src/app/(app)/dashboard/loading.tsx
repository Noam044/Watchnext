import { getI18n } from "@/i18n/server";

/** Squelette de « À voir » pendant le chargement des recommandations. */
export default async function Loading() {
  const { t } = await getI18n();
  return (
    <div className="space-y-8" aria-busy="true" aria-label={t.dashboard.loading}>
      {/* Comme la page : en-tête centré et deux actions de même largeur sur téléphone. */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:items-start">
          <div className="skeleton h-3 w-48" />
          <div className="skeleton h-4 w-72 max-w-full" />
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <div className="skeleton h-14 sm:h-10 sm:w-36 sm:rounded-full" />
          <div className="skeleton h-14 sm:h-10 sm:w-32 sm:rounded-full" />
        </div>
      </div>
      <div className="skeleton aspect-[2.39/1] w-full" />
      <div className="space-y-6 pt-6">
        <div className="skeleton h-10 w-64 max-w-full max-sm:mx-auto" />
        <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="space-y-3">
              <div className="skeleton aspect-[2/3]" />
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
