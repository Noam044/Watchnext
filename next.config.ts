import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Les images viennent toutes de TMDB, déjà disponibles en plusieurs tailles :
    // on les sert directement, sans passer par l'optimiseur d'images (quota limité sur Vercel).
    loader: "custom",
    loaderFile: "./src/lib/tmdb-image-loader.ts",
  },
};

export default nextConfig;
