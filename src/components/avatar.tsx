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

/** Pastille aux initiales ; la teinte dépend du pseudo pour rester stable. */
export function Avatar({
  name,
  handle,
  size = "md",
  className = "",
}: {
  name: string;
  handle: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const dims = { sm: "size-8 text-sm", md: "size-11 text-base", lg: "size-16 text-2xl", xl: "size-24 text-4xl sm:size-28 sm:text-5xl" }[size];
  return (
    <span
      className={`marquee inline-grid shrink-0 place-items-center rounded-full leading-none text-screen ring-2 ring-velvet-950 ${dims} ${className}`}
      style={{ backgroundColor: TONES[hash(handle) % TONES.length] }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
