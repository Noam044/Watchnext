<div align="center">

# Watchnext

**Your next favourite film is already in your ratings.**

Film recommendations built from your **Letterboxd** history (public RSS feed or official export), enriched with **TMDB**, and every pick comes with the reason it was chosen.

### [→ Try it now](https://watchnext-films.vercel.app)

https://github.com/user-attachments/assets/6fa2c288-c48a-4fe4-9892-a2ab89756181

<br>

![Next.js](https://img.shields.io/badge/Next.js_16-000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?logo=prisma&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

</div>

---

## Why

Hundreds of films rated on Letterboxd, and still nothing to watch tonight. Watchnext reads what you have already watched, rated and liked, builds a taste profile from it, and suggests films you haven't seen, each one explained: *"Because you liked X and Y"*, a favourite director, a recurring actor, or your own watchlist.

## Features

- **Two ways to import**: a quick import from your Letterboxd username (public RSS feed), or a full import of your Letterboxd export (`.zip` or CSV files) with a real progress bar and resumable batches.
- **Explained recommendations**: a hand-tuned scoring engine (genres, keywords, directors, cast, decade, TMDB quality) with a match percentage and a reason for every film.
- **"Tonight" filters**: only on my streaming services, max runtime, decade, original language, genre, from my watchlist.
- **Where to watch**: streaming, rental and purchase offers for your country (JustWatch data via TMDB).
- **Automatic sync**: your RSS feed is re-synced when you open the app and once a day for every account.
- **Profiles and friends**: public profiles, library with tabs, filters and sorting, taste stats, friend requests and a rating-based affinity score.
- **Watch together**: films neither of you has seen, picked for both tastes, which you can send to your friend in a message.
- **Messages**: friend-only conversations with shared film cards.
- **Installable PWA** with Web Push notifications (new message, friend request).
- **French and English** interface, including film titles and synopses.
- **Trailers, page transitions and cinema-themed animations**, all disabled when the user prefers reduced motion.

> Letterboxd is never scraped. The only sources are the public RSS feed and the export the user uploads. "View on Letterboxd" buttons are plain links.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, Route Handlers) · React 19 |
| Language & styling | TypeScript · Tailwind CSS 4 |
| Database | PostgreSQL + Prisma 7 (Neon in production) |
| Auth | Auth.js v5: email + password, bcrypt, JWT sessions |
| Data | TMDB API · Letterboxd RSS & export |
| Tests | Vitest (unit) · Playwright (end-to-end, against a mock TMDB) |
| Hosting | Vercel (with a daily cron job) |

## Getting started

Requirements: Node.js ≥ 22, Docker (or an existing PostgreSQL database) and a [TMDB API key](https://www.themoviedb.org/settings/api).

```bash
npm install                      # also runs `prisma generate`
cp .env.example .env             # then fill in the variables (see below)
docker compose up -d             # PostgreSQL on localhost:5433
npx prisma migrate deploy        # creates the tables
npm run dev                      # http://localhost:3000
```

Production build: `npm run build && npm start`.

### Tests

```bash
npm test             # unit tests (Vitest): Letterboxd parsers, engine, translations, filters, notifications, rate limits
npm run test:e2e     # full flow (Playwright): sign up → import an export → recommendations, in French then English
```

The end-to-end test runs the production build on port 3100 against a **mock TMDB server** (`e2e/mock-tmdb.mjs`) and a **dedicated database** `<db>_e2e` (created and migrated automatically, never wiped: each run signs up with a unique email). First run: `npx playwright install chromium`.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL URL. The one in `.env.example` matches `docker-compose.yml`. |
| `DATABASE_URL_UNPOOLED` | no | Direct connection used by migrations when `DATABASE_URL` goes through a pooler (Neon). |
| `AUTH_SECRET` | yes | Session signing secret. Generate one with `npx auth secret` or `openssl rand -base64 32`. |
| `TMDB_API_KEY` | yes | TMDB v3 key **or** v4 read access token (detected automatically). |
| `TMDB_LANGUAGE` | no | Language for titles and synopses (default `fr-FR`). |
| `CRON_SECRET` | in production | Secret for the `/api/cron/sync` scheduled job (sent by Vercel as `Authorization: Bearer …`). |
| `TMDB_API_BASE` | no | Alternative TMDB API URL (proxy, or mock server for tests). |
| `NEXT_PUBLIC_SITE_URL` | no | Public site URL (email links, link previews). Detected automatically on Vercel. |
| `SMTP_URL`, `EMAIL_FROM` | no | Password-reset emails through any SMTP service, e.g. `smtps://login:key@smtp-relay.brevo.com:465` and `Watchnext <you@example.com>`. Without SMTP in development, the email is printed to the console. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | no | Push notification keys (`npx web-push generate-vapid-keys`) and contact (`mailto:…`). Without them, notifications are disabled. |

### Deploying (Vercel + Neon)

1. On vercel.com, import the GitHub repository (Next.js is detected).
2. In the project's **Storage** tab, add a **Neon** (PostgreSQL) database. It sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct, used by migrations).
3. Add `AUTH_SECRET` (a production-only secret: `openssl rand -base64 32`), `TMDB_API_KEY` and `TMDB_LANGUAGE`.
4. Add `CRON_SECRET` (`openssl rand -hex 32`): Vercel sends it to the scheduled sync job, which rejects any call without it.
   - Push notifications: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`.
   - Password reset: `SMTP_URL` and `EMAIL_FROM`. Without them, the "Forgot password?" link is hidden.
5. Deploy. The `vercel-build` script runs `prisma migrate deploy` then `next build`, so the database is migrated on every deploy.
6. In the project settings (Functions), put the functions in the same region as the database (e.g. `fra1` for a Neon database in Frankfurt).

Images are served straight from TMDB's CDN at the closest available size (`src/lib/tmdb-image-loader.ts`), so Vercel's image optimizer and its quota are not used.

## How it works

### User flow

1. **Sign up / sign in**: email + password (8 characters minimum, bcrypt hash).
2. **Import** (`/import`):
   - **Quick import**: Letterboxd username → `https://letterboxd.com/{username}/rss/`. Only the ~50 latest diary entries are available. The TMDB ID comes straight from the feed (`tmdb:movieId`).
   - **Full import**: the `.zip` export (Settings → Data → Export your data) or individual CSV files. `watched.csv`, `ratings.csv`, `diary.csv`, `watchlist.csv`, `likes/films.csv` and `reviews.csv` are read; `deleted/` and `orphaned/` are ignored. Each film is matched on TMDB by title and year, and films that can't be found are listed on the page.
3. **To watch** (`/dashboard`): the #1 pick shown large on its cinema ticket, then the rest of the selection (20 films, then "Show more"), each with its explanation and where to watch it.
   - **"Tonight" filters** apply to the featured film too and are remembered in a cookie (`wn_filters`).
4. **Update**: re-sync the RSS feed, recompute, re-import an export or restore hidden films. Imports are merged without duplicates.
   - **Automatic RSS sync** when opening "To watch" if the last attempt is older than 6 h (started after the response with `after()`), and every day at 05:00 UTC for all accounts via the Vercel cron (`vercel.json` → `/api/cron/sync`). A database lock (`syncStartedAt`) prevents concurrent syncs; recommendations are only recomputed when entries changed.
   - The feed contains neither the watchlist nor ratings given without a diary entry, so a reminder suggests a new full export when the last one is older than 30 days.
5. **Profile** (`/u/{handle}`): banner from your favourite film, stats, tastes (genres, directors, actors), and the full library split into tabs (rated, watched, liked, watchlist), filterable by rating from the histogram, sortable and paginated.
6. **Film page** (`/film/{tmdbId}`): your review (rating, like, date, text), why it was recommended, your friends' ratings and reviews (spoilers hidden by default), synopsis, where to watch it in your country, and credits.
7. **Messages** (`/messages`): friends only (checked server-side on send and read), text and shared films. The thread refreshes every 4 s while the tab is visible. Limited to 20 messages per minute.
8. **Friends** (`/friends`): search by name or @handle, incoming and outgoing requests, friends sorted by affinity.
   - A member's library is only visible to their friends unless they make it public.
   - Affinity: `1 − mean rating gap / 3` over films both rated, computed from 5 shared films.
9. **Watch together** (`/duo/{handle}`): films neither friend has seen, chosen for both tastes. Each idea shows what each of you liked that's close to it, and can be suggested in the chat. Filters: on our services (combined subscriptions), 2 h max.

### Recommendation engine

1. **Weight of each watched film**: `(rating − 2.75) / 2.25`, so 5★ → +1, 3★ → +0.11 and ½★ → −1. A like adds +0.35. A watched but unrated film counts +0.12, or +0.8 if liked. Poorly rated films therefore count against their features.
2. **Taste profile** over genres, directors, top 5 cast members, TMDB keywords and decade.
   - Raw affinity of each feature: `Σ weight / √(n + 2)`, so recurrence matters without letting "Drama" crush everything else.
   - Affinities are then normalised to [−1, 1] within each family.
3. **Candidates**:
   - TMDB `/recommendations` and `/similar` for the 12 best-rated films, with a boost for recent watches.
   - `/discover` on favourite genres (alone and combined), top 3 directors and top 5 keywords.
   - Films from the watchlist.
4. **Filters**: films already watched, hidden or not yet released are excluded, and at least 150 TMDB votes are required (20 for the watchlist).
5. **Score**:
   - `0.55 × profile proximity + 0.25 × quality + 0.20 × support + 0.08 if on the watchlist`.
   - Profile proximity: genres 28%, keywords 27%, director 20%, cast 15%, decade 10%.
   - Quality: TMDB Bayesian rating with m = 400 and C = 6.4.
   - Support: how many liked films lead to the candidate.
   - Only the top 140 pre-scored candidates get full details. At most 3 films per director are kept, then the top 80, whose streaming offers are refreshed.
6. **Explanation**: "Because you liked X and Y" from the liked films that led to the candidate (or those sharing the most features with it), plus tags: favourite director, recurring actor, watchlist.
7. **Watch together** (`src/lib/duo.ts`): candidates are both friends' recommendations and watchlists, minus films either has watched or hidden. Each film is scored against each profile (`0.65 × proximity + 0.35 × quality`, +0.06 if on their watchlist); the shared score is `0.6 × the lower + 0.4 × the mean`, so neither of you gets bored. At most 2 films per director.

### Architecture

```
src/
├── auth.ts                         Auth.js (Credentials + JWT)
├── actions/                        Server Actions (auth, RSS sync, recompute, hide / seen, profile, friends)
├── app/
│   ├── page.tsx                    Landing page
│   ├── (auth)/login, register      Forms
│   ├── (app)/layout.tsx            Protected shell (requireUser)
│   ├── (app)/dashboard             Recommendations
│   ├── (app)/import                Onboarding / re-import + films not found
│   ├── (app)/u/[handle]            Member profile (library, tastes, affinity)
│   ├── (app)/profile, profile/edit Shortcut to your profile, account settings
│   ├── (app)/friends               Member search, requests, friend list
│   └── api/
│       ├── auth/[...nextauth]
│       ├── import                  POST: upload .zip / .csv → ImportJob
│       └── import/[id]/process     POST: process the next batch and return progress
├── components/                     UI (ImportPanel, RecoGrid, DashboardActions…)
└── lib/
    ├── tmdb.ts                     TMDB client: database cache, concurrency limit, 429 retry
    ├── films.ts                    Film cache, details (credits + keywords), title + year matching
    ├── library.ts                  Duplicate-free UserFilm merging
    ├── profile.ts                  Paginated library, favourite film
    ├── friends.ts                  Friendships, visibility, affinity
    ├── users.ts                    Handles (@handle)
    ├── showcase.ts                 Featured films (landing, sign-in)
    ├── import.ts                   RSS sync, batched full import (resumable)
    ├── letterboxd/rss.ts           RSS feed parsing
    ├── letterboxd/export.ts        Zip and CSV parsing, deduplication
    └── reco/profile.ts, engine.ts  Taste profile and recommendation engine
```

Key decisions:

- **All external calls happen on the server** (Server Actions and Route Handlers). The TMDB key never reaches the browser.
- **Two-level TMDB cache**:
  - The `Film` table stores each film's metadata, shared across users. Details are refreshed after 30 days.
  - The `TmdbCache` table stores search (30 d), recommendations and similar (7 d), discover (2 d) and genre (30 d) responses.
- **Full imports run in batches.** The upload creates an `ImportJob` and its `ImportEntry` rows; the client then calls `/process` in a loop, 30 films per call. Each call stays short, which suits serverless, and the progress bar is real. If the TMDB quota is hit, remaining entries stay `PENDING` and "Resume import" picks up from there.

### Database schema

| Model | Role |
|---|---|
| `User` | unique email, bcrypt `passwordHash`, unique `handle`, `bio`, `publicProfile`, `emblemFilmId` (favourite film), `avatarAt`, `watchRegion` and `streamingProviders` |
| `UserAvatar` | profile picture (256 px WebP), served by `/api/avatar/{userId}` to signed-in members |
| `Friendship` | `requesterId` → `addresseeId`, `status` (`PENDING` / `ACCEPTED`). One row per pair: crossed requests count as accepted. |
| `LetterboxdProfile` | username, `lastRssSync`, `lastImportAt` (1–1 with User) |
| `Film` | unique `tmdbId`, title, year, poster, votes, `originalLanguage`, `genres` / `directors` / `cast` / `keywords` as JSON, `providers` per country + `providersAt`, `detailsFetchedAt` |
| `UserFilm` | unique (userId, filmId): `watched`, `inWatchlist`, `rating` (0.5–5), `liked`, `watchedAt`, `review` (+ `reviewSpoilers`, `reviewedAt`) |
| `Recommendation` | unique (userId, filmId): `score`, `reason`, `details` (JSON: %, tags, components), `hidden` |
| `TmdbCache` | request key → JSON response + `expiresAt` |
| `Message` | `senderId` → `recipientId`, `body` and/or `filmId` (shared film), `readAt` |
| `ImportJob` / `ImportEntry` | full-import tracking. `NOT_FOUND` entries make up the list of films not found. |

Merge rules: `watched` and `liked` accumulate. The most recent rating wins, as does the most recent watch date. A watched film leaves the watchlist and the recommendations.

### Security and robustness

- **Rate limiting** (`src/lib/rate-limit.ts`): 5 wrong passwords per account and 30 per IP per 15 min; 5 sign-ups per IP per hour; 3 reset links per account and 10 per IP per hour. The login limit is checked inside Auth.js `authorize()`, so it also covers `/api/auth/callback/credentials`.
- **Password reset**: single-use link valid for 1 h; only the SHA-256 hash of the token is stored. The response is identical whether or not the email has an account.
- **Shared links**: a film page opened without an account shows a public version (known films only, no TMDB call) with its Open Graph preview. Every other page is members-only.
- **Performance**: friend affinities, banners and latest messages are each computed in a single SQL query, whatever the number of friends.

### Error handling

| Case | Behaviour |
|---|---|
| Invalid or unknown username (RSS 404) | dedicated message |
| Empty or private feed | suggests the full import |
| Invalid CSV, corrupt zip, unrecognised file, > 25 MB | message naming the file |
| TMDB quota (429) | 3 retries following `Retry-After`, then a message. The import can resume without losing anything. |
| Missing or invalid TMDB key, TMDB down | explicit message |
| Fewer than 3 watched films | invitation to import more |

## Design

A "movie theatre" theme: near-black burgundy velvet (`velvet-*`), ivory text (`screen`), tungsten accent (`tungsten`), curtain red (`curtain`) for badges and an "exit sign" green (`exit`) kept for confirmations. Tokens live in `src/app/globals.css`.

- Typefaces: Big Shoulders for headings, Hanken Grotesk for body text, Courier Prime for technical details.
- Signature element: the 2.39:1 CinemaScope screen (`ScopeScreen`) used for the #1 pick, the profile banner and friend cards. It "lights up" on load.
- Animations, all disabled under reduced motion: an expanding poster wall on the landing page, letter-by-letter title reveals, rolling numbers ([Number Flow](https://number-flow.barvian.me)), a 35 mm filmstrip whose frames develop from negative, trailers that open the screen from CinemaScope to 16:9 (privacy-enhanced YouTube, loaded on click), view transitions between pages, scroll-driven reveals and 3D poster tilt.
- Mobile: bottom tab bar.

## Credits

Film data from [TMDB](https://www.themoviedb.org). This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability by [JustWatch](https://www.justwatch.com). Not affiliated with Letterboxd.

## License

[MIT](LICENSE) © 2026 Noam Bouriche
