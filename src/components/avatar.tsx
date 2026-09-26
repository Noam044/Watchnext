const TONES = ["#9b1c2e", "#7a3b1d", "#5b2a55", "#1f4d4a", "#6b4b12", "#34406e"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string) {
  const parts = name.trim().split(/[\s_.-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * Photo de profil, ou à défaut pastille aux initiales (la teinte dépend du pseudo pour rester stable).
 * La pastille reste dessous pendant le chargement de la photo.
 */
export function Avatar({
  name,
  handle,
  src = null,
  size = "md",
  className = "",
}: {
  name: string;
  handle: string;
  /** URL de la photo (voir avatarUrl), null sans photo. */
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const dims = { sm: "size-8 text-sm", md: "size-11 text-base", lg: "size-16 text-2xl", xl: "size-24 text-4xl sm:size-28 sm:text-5xl" }[size];
  return (
    <span
      className={`marquee relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full leading-none text-screen ring-2 ring-velvet-950 ${dims} ${className}`}
      style={{ backgroundColor: TONES[hash(handle) % TONES.length] }}
      aria-hidden
    >
      {initials(name)}
      {src && (
        // Petite image déjà à la bonne taille, servie par /api/avatar : pas besoin de next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full rounded-full object-cover" />
      )}
    </span>
  );
}
