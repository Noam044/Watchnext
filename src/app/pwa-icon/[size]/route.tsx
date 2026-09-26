import { ImageResponse } from "next/og";

/** Tailles d'icône demandées par le manifeste ; « maskable » : dessin réduit dans la zone sûre, fond plein. */
const SIZES: Record<string, { px: number; maskable: boolean }> = {
  "192": { px: 192, maskable: false },
  "512": { px: 512, maskable: false },
  "512-maskable": { px: 512, maskable: true },
  "180": { px: 180, maskable: true },
};

/** Même dessin que src/app/icon.svg : l'écran ambré et le faisceau, sur le velours. */
function iconSvg(maskable: boolean) {
  const drawing = `<rect x="8" y="17" width="48" height="20" rx="2.5" fill="#f2b84b"/><path d="M17 51 32 42 47 51" fill="none" stroke="#f2b84b" stroke-opacity="0.45" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  return maskable
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#120809"/><g transform="translate(32 32) scale(0.72) translate(-32 -32)">${drawing}</g></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#120809"/>${drawing}</svg>`;
}

/** Icône PNG de l'app installée. */
export async function GET(_req: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  const spec = SIZES[(await ctx.params).size];
  if (!spec) return new Response(null, { status: 404 });
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(iconSvg(spec.maskable))}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendu par next/og, pas par le navigateur */}
        <img src={src} alt="" width={spec.px} height={spec.px} />
      </div>
    ),
    { width: spec.px, height: spec.px, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
