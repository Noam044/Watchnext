import type { MetadataRoute } from "next";
import { dictionaries } from "@/i18n/dictionaries";

/** Manifeste de l'app : Watchnext s'installe sur l'écran d'accueil et s'ouvre sans barre de navigateur. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Watchnext",
    short_name: "Watchnext",
    description: dictionaries.fr.common.appDescription,
    lang: "fr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#120809",
    theme_color: "#120809",
    categories: ["entertainment", "social"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
