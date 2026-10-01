# Project memory

Durable notes for agents working on Watchnext. The README documents features, architecture, the
recommendation engine and the schema; this file only keeps what is easy to get wrong.

## Commands and environment

- Local Postgres runs from `docker compose up -d` on port **5433**, not 5432.
- The Prisma client is generated into `src/generated/prisma` (gitignored) by `postinstall`. Import it
  from `@/generated/prisma/client`, never from `@prisma/client`.
- `npm run typecheck` runs `next typegen` first: `PageProps`, `LayoutProps` and `RouteContext` are
  generated global types, so a bare `tsc` fails on a fresh checkout.
- Unit tests only match `src/**/*.test.ts`; `server-only` is aliased to a stub in `vitest.config.mts`.
- `npm run eval` scores the recommendation engine on hand-labelled personas (`evals/reco/`). Run it
  after touching weights in `src/lib/reco/`; a known engine flaw is recorded as `knownIssues` and
  turns the eval red once fixed, so the entry can be removed.

## Database and deploys

- Migrations use `DATABASE_URL_UNPOOLED` when set (Neon direct connection); the app uses the pooled
  `DATABASE_URL`. Keep that split when touching `prisma.config.ts` or `src/lib/db.ts`.
- `vercel-build` runs `prisma migrate deploy` before `next build` on every deploy, and the old
  deployment keeps serving meanwhile: migrations must stay compatible with the previous code
  (add, backfill, then drop in a later change).
- End-to-end tests write to `<db>_e2e`; `e2e/global-setup.ts` refuses any database without that
  suffix. The database is never wiped, so each run signs up with a unique email.
- E2E runs the production build on port 3100 against the mock TMDB in `e2e/mock-tmdb.mjs`
  (port 4010). A feature that calls a new TMDB endpoint needs a matching mock response.

## Product rules

- Letterboxd is never scraped: only the public RSS feed and the user's own export. Letterboxd buttons
  are plain links.
- Every TMDB call stays on the server (Server Actions, Route Handlers); the key never reaches the
  browser. Go through `src/lib/tmdb.ts` so the database cache, concurrency limit and 429 retries apply.
- Images go through `src/lib/tmdb-image-loader.ts` straight from TMDB's CDN, never through Vercel's
  image optimizer (quota).
- Interface text lives in `src/i18n/dict/`, declared with `pair(fr, en)`: French is the source shape
  and English must match it. French is the default locale.
- Every animation has a `prefers-reduced-motion` fallback.

## Conventions

- Code comments are in French; README, commit messages and PRs are in English.
- Commit subjects are imperative sentences without a prefix ("Add …", "Fix …"), with a wrapped
  prose body explaining the change for the user. No AI co-author trailer.
- CI (`.github/workflows/ci.yml`) must be green before merging: lint, typecheck, unit tests and
  the Playwright journey.
