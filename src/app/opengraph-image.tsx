import { ImageResponse } from "next/og";
import { dictionaries } from "@/i18n/dictionaries";
import { OG_COLORS, OG_SIZE, OgLogo, ogFonts } from "@/lib/og";

export const alt = "Watchnext";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Aperçu de lien du site : l'écran Cinémascope allumé sur le velours, et la promesse de l'app. */
export default async function Image() {
  const l = dictionaries.fr.landing;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: `radial-gradient(ellipse at 50% 120%, #3a1a1e 0%, ${OG_COLORS.velvet} 60%)`,
        color: OG_COLORS.screen,
      }}
    >
      <OgLogo size={40} />
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontFamily: "Big Shoulders",
            fontSize: 104,
            lineHeight: 0.9,
            textTransform: "uppercase",
          }}
        >
          <span>{l.headline1}&nbsp;</span>
          <span style={{ color: OG_COLORS.tungsten }}>{l.headline2}</span>
        </div>
        <div style={{ fontFamily: "Hanken Grotesk", fontSize: 32, color: OG_COLORS.dust, maxWidth: 900 }}>
          {dictionaries.fr.common.appDescription}
        </div>
      </div>
    </div>,
    { ...size, fonts: await ogFonts() },
  );
}
