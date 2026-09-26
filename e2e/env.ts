/**
 * Base de données des tests de bout en bout : celle de .env, sous le nom « <base>_e2e ».
 * Séparée de la base de développement, car les réponses du TMDB factice y sont mises en cache.
 */
if (!process.env.DATABASE_URL) process.loadEnvFile?.(".env");

export const E2E_DATABASE_URL = (() => {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  const url = new URL(process.env.DATABASE_URL ?? "postgresql://watchnext:watchnext@localhost:5433/watchnext");
  url.pathname = `${url.pathname.replace(/_e2e$/, "")}_e2e`;
  return url.toString();
})();
