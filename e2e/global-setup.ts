import { execSync } from "node:child_process";
import { Client } from "pg";
import { E2E_DATABASE_URL } from "./env";

/**
 * Crée la base de test si besoin et lui applique les migrations (sans rien effacer).
 * Chaque test crée ses propres comptes (adresse email unique) : la base peut être gardée d'un lancement à l'autre.
 */
export default async function globalSetup() {
  const url = new URL(E2E_DATABASE_URL);
  const name = url.pathname.slice(1);
  // Garde-fou : les tests n'écrivent jamais dans une base qui n'est pas explicitement une base de test.
  if (!/_e2e$/.test(name)) throw new Error(`Base de test attendue (suffixe _e2e), reçu : ${name}`);

  const admin = new URL(url);
  admin.pathname = "/postgres";
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
  if (!exists.rowCount) await client.query(`CREATE DATABASE "${name}"`);
  await client.end();

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL, DATABASE_URL_UNPOOLED: E2E_DATABASE_URL },
  });
}
