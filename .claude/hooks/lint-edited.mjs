#!/usr/bin/env node
// Hook PostToolUse (Edit / Write) : lance ESLint sur le fichier modifié et renvoie les erreurs
// à Claude (code 2), pour les corriger avant le commit plutôt qu'en CI.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const LINTED = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

let file = "";
try {
  file = JSON.parse(readFileSync(0, "utf8")).tool_input?.file_path ?? "";
} catch {
  process.exit(0);
}

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const rel = relative(root, file);
if (!file || !LINTED.test(file) || rel.startsWith("..") || !existsSync(file)) process.exit(0);

const eslint = join(root, "node_modules", ".bin", "eslint");
if (!existsSync(eslint)) process.exit(0);

const res = spawnSync(eslint, ["--no-warn-ignored", rel], { cwd: root, encoding: "utf8", timeout: 60_000 });
if (res.status === 1) {
  process.stderr.write(`ESLint signale des erreurs dans ${rel} :\n${res.stdout}`);
  process.exit(2);
}
