import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Dimensions recommandées pour les aperçus de liens (Open Graph). */
export const OG_SIZE = { width: 1200, height: 630 };

export const OG_COLORS = { velvet: "#120809", screen: "#f6ecdc", tungsten: "#f2b84b", dust: "#c6ada5" };

const FONTS = join(process.cwd(), "src/assets/fonts");

/** Polices de l'identité (WOFF, lu par next/og) : Big Shoulders pour les titres, Hanken Grotesk pour le texte. */
export async function ogFonts() {
  const [display, body] = await Promise.all([
    readFile(join(FONTS, "big-shoulders-latin-800-normal.woff")),
    readFile(join(FONTS, "hanken-grotesk-latin-500-normal.woff")),
  ]);
  return [
    { name: "Big Shoulders", data: display, weight: 800 as const, style: "normal" as const },
    { name: "Hanken Grotesk", data: body, weight: 500 as const, style: "normal" as const },
  ];
}

/** Logotype « WATCHNEXT » avec son écran. */
export function OgLogo({ size = 34 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.4 }}>
      <div style={{ width: size * 1.3, height: size * 0.55, borderRadius: 3, background: OG_COLORS.tungsten }} />
      <div style={{ display: "flex", fontFamily: "Big Shoulders", fontSize: size, letterSpacing: 1 }}>
        <span style={{ color: OG_COLORS.screen }}>WATCH</span>
        <span style={{ color: OG_COLORS.tungsten }}>NEXT</span>
      </div>
    </div>
  );
}
