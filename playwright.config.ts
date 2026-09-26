import { defineConfig, devices } from "@playwright/test";
import { E2E_DATABASE_URL } from "./e2e/env";

/**
 * Tests de bout en bout : l'app de production (next build + next start) sur le port 3100,
 * branchée sur un TMDB factice (e2e/mock-tmdb.mjs) et sur une base de test dédiée
 * (<base>_e2e, créée et migrée par e2e/global-setup.ts).
 */
const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, ...devices["Desktop Chrome"], locale: "fr-FR" },
  webServer: [
    { command: "node e2e/mock-tmdb.mjs", port: 4010, reuseExistingServer: true },
    {
      command: `npm run build && npx next start -p ${PORT}`,
      port: PORT,
      timeout: 300_000,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        DATABASE_URL_UNPOOLED: E2E_DATABASE_URL,
        TMDB_API_BASE: "http://localhost:4010/3",
        TMDB_API_KEY: "e2e-mock",
        NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      },
    },
  ],
});
