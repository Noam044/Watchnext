# Watchnext

Recommandations de films à partir de ton historique **Letterboxd** (flux RSS public ou export officiel), enrichies par **TMDB**.

Stack : Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma 7 · Auth.js v5 (email + mot de passe, bcrypt).

## Installation

Prérequis : Node.js ≥ 20, Docker (ou un PostgreSQL existant), une clé API TMDB.

```bash
npm install                      # lance aussi `prisma generate`
cp .env.example .env             # puis remplis les variables (voir ci-dessous)
docker compose up -d             # PostgreSQL sur localhost:5433
npx prisma migrate deploy        # crée les tables
npm run dev                      # http://localhost:3000
```

Production : `npm run build && npm start`.

### Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `DATABASE_URL` | oui | URL PostgreSQL. Celle de `.env.example` correspond au `docker-compose.yml`. |
| `AUTH_SECRET` | oui | Secret de signature des sessions. Générer avec `npx auth secret` ou `openssl rand -base64 32`. |
| `TMDB_API_KEY` | oui | Clé TMDB v3 **ou** jeton de lecture v4 (détecté automatiquement). À obtenir sur https://www.themoviedb.org/settings/api |
| `TMDB_LANGUAGE` | non | Langue des titres et synopsis (`fr-FR` par défaut). |
| `TMDB_API_BASE` | non | Autre URL pour l'API TMDB (proxy ou serveur factice pour les tests). |

## Parcours

1. **Inscription / connexion** : email + mot de passe (8 caractères minimum, hash bcrypt).
2. **Import** (`/import`) :
   - **Import rapide** : pseudo Letterboxd → lecture de `https://letterboxd.com/{pseudo}/rss/`. Seules les ~50 dernières entrées du journal sont disponibles. L'ID TMDB vient directement du flux (`tmdb:movieId`).
   - **Import complet** : export `.zip` (Settings → Data → Export your data) ou CSV séparés. Les fichiers lus sont `watched.csv`, `ratings.csv`, `diary.csv`, `watchlist.csv` et `likes/films.csv`. Les dossiers `deleted/` et `orphaned/` sont ignorés. Chaque film est retrouvé sur TMDB par titre et année. Les films introuvables sont listés sur la page.
3. **Tableau de bord** (`/dashboard`) : nombre de films, note moyenne, likes, watchlist, genres et réalisateurs préférés, répartition des notes, puis les recommandations avec leur explication.
4. **Mettre à jour** : resynchroniser le RSS, recalculer, réimporter un export ou réafficher les films masqués. Les imports se fusionnent sans doublon.

## Architecture

```
src/
├── auth.ts                         Auth.js (Credentials + JWT)
├── actions/                        Server Actions (auth, synchro RSS, recalcul, masquer / déjà vu)
├── app/
│   ├── page.tsx                    Page d'accueil
│   ├── (auth)/login, register      Formulaires
│   ├── (app)/layout.tsx            Coque protégée (requireUser)
│   ├── (app)/dashboard             Profil + recommandations
│   ├── (app)/import                Onboarding / réimport + films introuvables
│   └── api/
│       ├── auth/[...nextauth]
│       ├── import                  POST : upload .zip / .csv → ImportJob
│       └── import/[id]/process     POST : traite le lot suivant et renvoie la progression
├── components/                     UI (ImportPanel, RecoGrid, DashboardActions…)
└── lib/
    ├── tmdb.ts                     Client TMDB : cache en base, limite de concurrence, retry 429
    ├── films.ts                    Cache des films, détails (crédits + mots-clés), correspondance titre+année
    ├── library.ts                  Fusion UserFilm sans doublon
    ├── import.ts                   Synchro RSS, import complet par lots (reprise possible)
    ├── letterboxd/rss.ts           Lecture et analyse du flux RSS
    ├── letterboxd/export.ts        Lecture du zip et des CSV, dédoublonnage
    └── reco/profile.ts, engine.ts  Profil de goûts et moteur de recommandation
```

Choix principaux :

- **Letterboxd n'est jamais scrapé.** Les deux seules sources sont le flux RSS public et l'export fourni par l'utilisateur. Les liens « Voir sur Letterboxd » ne sont que des liens (`letterboxd.com/tmdb/{id}`) : aucune page n'est lue côté serveur.
- **Tous les appels externes passent par le serveur** (Server Actions et Route Handlers). La clé TMDB n'est jamais envoyée au navigateur.
- **Deux niveaux de cache TMDB** :
  - La table `Film` garde les métadonnées de chaque film, partagées entre tous les utilisateurs. Les détails sont rafraîchis au bout de 30 jours.
  - La table `TmdbCache` garde les réponses de search (30 j), recommendations et similar (7 j), discover (2 j) et genres (30 j).
- **L'import complet se fait par lots.** L'upload crée un `ImportJob` et ses `ImportEntry`. Le client appelle ensuite `/process` en boucle, 30 films par appel. Chaque appel reste court, ce qui convient au serverless, et la barre de progression est réelle. Si le quota TMDB est atteint, les entrées restantes restent `PENDING` : le bouton « Reprendre l'import » repart de là.

## Schéma de base de données

| Modèle | Rôle |
|---|---|
| `User` | email unique, `passwordHash` bcrypt |
| `LetterboxdProfile` | pseudo, `lastRssSync`, `lastImportAt` (1–1 avec User) |
| `Film` | `tmdbId` unique, titre, année, affiche, votes, `genres` / `directors` / `cast` / `keywords` en JSON, `detailsFetchedAt` |
| `UserFilm` | (userId, filmId) unique : `watched`, `inWatchlist`, `rating` (0,5–5), `liked`, `watchedAt` |
| `Recommendation` | (userId, filmId) unique : `score`, `reason`, `details` (JSON : %, étiquettes, composantes), `hidden` |
| `TmdbCache` | clé de requête → réponse JSON + `expiresAt` |
| `ImportJob` / `ImportEntry` | suivi d'un import complet. Les entrées `NOT_FOUND` forment la liste des films introuvables. |

Règles de fusion : `watched` et `liked` se cumulent. La note la plus récente l'emporte, tout comme la date de visionnage. Un film vu sort de la watchlist et des recommandations.

## Algorithme de recommandation (v1)

1. **Poids de chaque film vu** : `(note − 2,75) / 2,25`, soit 5★ → +1, 3★ → +0,11 et 0,5★ → −1. Un like ajoute +0,35. Un film vu mais non noté vaut +0,12, ou +0,8 s'il est liké. Les films mal notés comptent donc négativement.
2. **Profil de goûts** : caractéristiques = genres, réalisateurs, 5 acteurs principaux, mots-clés TMDB et décennie.
   - Affinité brute de chaque caractéristique : `Σ poids / √(n + 2)`. La récurrence compte, mais sans laisser « Drame » écraser le reste.
   - L'affinité est ensuite normalisée dans [−1, 1] au sein de chaque famille.
3. **Candidats** :
   - `/recommendations` et `/similar` des 12 films les mieux notés, avec un bonus pour les visionnages récents.
   - `/discover` sur les genres favoris (seuls et combinés), les 3 réalisateurs favoris et les 5 mots-clés favoris.
   - Les films de la watchlist.
4. **Filtres** : films déjà vus, masqués ou pas encore sortis exclus, et au moins 150 votes TMDB (20 pour la watchlist).
5. **Score** :
   - Formule : `0,55 × proximité au profil + 0,25 × qualité + 0,20 × support + 0,08 si le film est dans la watchlist`.
   - Proximité au profil : genres 28 %, mots-clés 27 %, réalisateur 20 %, acteurs 15 %, décennie 10 %.
   - Qualité : note bayésienne TMDB, avec m = 400 et C = 6,4.
   - Support : nombre de films aimés qui mènent au candidat.
   - Seuls les 80 meilleurs candidats du pré-score reçoivent leurs détails complets. On garde au plus 3 films par réalisateur, puis les 40 premiers.
6. **Explication** :
   - « Parce que tu as aimé X et Y » : les films aimés qui ont mené au candidat. À défaut, ceux qui partagent le plus de caractéristiques avec lui.
   - S'y ajoutent des étiquettes : réalisateur apprécié, acteur récurrent, watchlist.

## Gestion des erreurs

| Cas | Comportement |
|---|---|
| Pseudo invalide ou inexistant (RSS 404) | message dédié |
| Flux vide ou privé | invitation à passer par l'import complet |
| CSV invalide, zip corrompu, fichier non reconnu, > 25 Mo | message nommant le fichier concerné |
| Quota TMDB (429) | 3 nouvelles tentatives en suivant `Retry-After`, puis message. L'import peut reprendre sans rien perdre. |
| Clé TMDB absente ou invalide, TMDB indisponible | message explicite |
| Moins de 3 films vus | invitation à importer davantage |

Données de films : [TMDB](https://www.themoviedb.org). Ce produit utilise l'API TMDB sans être approuvé ni certifié par TMDB. Non affilié à Letterboxd.
