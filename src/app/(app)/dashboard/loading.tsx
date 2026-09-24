/** Squelette de « À voir » pendant le chargement des recommandations. */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Chargement de ta sélection">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="skeleton h-3 w-48" />
          <div className="skeleton h-4 w-72 max-w-full" />
        </div>
        <div className="hidden gap-2 sm:flex">
          <div className="skeleton h-10 w-36 rounded-full" />
          <div className="skeleton h-10 w-32 rounded-full" />
        </div>
      </div>
      <div className="skeleton aspect-[2.39/1] w-full" />
      <div className="space-y-6 pt-6">
        <div className="skeleton h-10 w-64" />
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
