## What and why

<!-- What changes for the user, and why. -->

## Checklist

- [ ] `npm run lint`, `npm run typecheck` and `npm test` pass (CI runs them, plus the Playwright journey)
- [ ] New interface text exists in French **and** English (`src/i18n/dict/`)
- [ ] New animations are disabled with `prefers-reduced-motion`
- [ ] Prisma migrations are safe to apply before the new code is live (`vercel-build` migrates on every deploy)
- [ ] README updated if a feature, env variable or rule changed
