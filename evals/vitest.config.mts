import { defineConfig } from "vitest/config";
import base from "../vitest.config.mjs";

// Évaluations du moteur : lancées par `npm run eval`, à part des tests unitaires.
export default defineConfig({
  ...base,
  test: { ...base.test, include: ["evals/**/*.eval.ts"] },
});
