import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Polices lues à l'exécution par les images d'aperçu (next/og) : à embarquer dans les fonctions serverless.
  outputFileTracingIncludes: {
    "/**/*": ["./src/assets/fonts/*.woff"],
  },
  // Le service worker doit toujours être relu : une ancienne version ne doit pas rester en cache.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
  images: {
    // Les images viennent toutes de TMDB, déjà disponibles en plusieurs tailles :
    // on les sert directement, sans passer par l'optimiseur d'images (quota limité sur Vercel).
    loader: "custom",
    loaderFile: "./src/lib/tmdb-image-loader.ts",
  },
};

export default nextConfig;
