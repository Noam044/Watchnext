#!/usr/bin/env node
// Hook PreToolUse (Bash) : demande confirmation avant une commande qui efface des données
// (base Prisma/Postgres) ou réécrit l'historique distant.
import { readFileSync } from "node:fs";

const RULES = [
  [/\bprisma\s+migrate\s+reset\b/, "`prisma migrate reset` vide entièrement la base."],
  [/\bprisma\s+db\s+push\b.*--(force-reset|accept-data-loss)\b/, "`prisma db push` avec perte de données."],
  [/\bdrop\s+(database|schema|table)\b/i, "Suppression SQL (DROP)."],
  [/\btruncate\s+(table\s+)?\w/i, "Vidage SQL (TRUNCATE)."],
  [/\bdocker\s+compose\s+down\b.*\s(-v|--volumes)\b/, "`docker compose down -v` supprime le volume Postgres local."],
  [/\bgit\s+push\b.*\s(-f|--force|--force-with-lease)\b/, "Push forcé : réécrit l'historique distant."],
];

let command = "";
try {
  command = JSON.parse(readFileSync(0, "utf8")).tool_input?.command ?? "";
} catch {
  process.exit(0);
}

const hit = RULES.find(([pattern]) => pattern.test(command));
if (hit) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: `Commande destructive : ${hit[1]}`,
      },
    }),
  );
}
