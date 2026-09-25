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

### Déploiement (Vercel + Neon)

1. Sur vercel.com, importe le dépôt GitHub (framework détecté : Next.js).
2. Onglet **Storage** du projet : ajoute une base **Neon** (PostgreSQL). Elle renseigne `DATABASE_URL` (via le pooler) et `DATABASE_URL_UNPOOLED` (connexion directe, utilisée par les migrations).
3. Ajoute `AUTH_SECRET` (un secret propre à la production : `openssl rand -base64 32`), `TMDB_API_KEY` et `TMDB_LANGUAGE`.
4. Ajoute `CRON_SECRET` (`openssl rand -hex 32`) : Vercel l'envoie à la tâche planifiée de synchronisation, qui refuse tout appel sans lui.
5. Déploie. Le script `vercel-build` lance `prisma migrate deploy` puis `next build` : la base est migrée à chaque déploiement.
6. Dans les réglages du projet (Functions), place les fonctions dans la même région que la base (ex. `fra1` pour une base Neon à Francfort).

Les images sont servies directement par le CDN de TMDB, dans la taille la plus proche de celle demandée (`src/lib/tmdb-image-loader.ts`) : l'optimiseur d'images de Vercel et son quota ne sont pas utilisés.

### Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `DATABASE_URL` | oui | URL PostgreSQL. Celle de `.env.example` correspond au `docker-compose.yml`. |
| `DATABASE_URL_UNPOOLED` | non | Connexion directe pour les migrations, si `DATABASE_URL` passe par un pooler (Neon). |
| `AUTH_SECRET` | oui | Secret de signature des sessions. Générer avec `npx auth secret` ou `openssl rand -base64 32`. |
| `TMDB_API_KEY` | oui | Clé TMDB v3 **ou** jeton de lecture v4 (détecté automatiquement). À obtenir sur https://www.themoviedb.org/settings/api |
| `TMDB_LANGUAGE` | non | Langue des titres et synopsis (`fr-FR` par défaut). |
| `CRON_SECRET` | en production | Secret de la tâche planifiée `/api/cron/sync` (envoyé par Vercel dans `Authorization: Bearer …`). |
| `TMDB_API_BASE` | non | Autre URL pour l'API TMDB (proxy ou serveur factice pour les tests). |

## Parcours

1. **Inscription / connexion** : email + mot de passe (8 caractères minimum, hash bcrypt).
2. **Import** (`/import`) :
   - **Import rapide** : pseudo Letterboxd → lecture de `https://letterboxd.com/{pseudo}/rss/`. Seules les ~50 dernières entrées du journal sont disponibles. L'ID TMDB vient directement du flux (`tmdb:movieId`).
   - **Import complet** : export `.zip` (Settings → Data → Export your data) ou CSV séparés. Les fichiers lus sont `watched.csv`, `ratings.csv`, `diary.csv`, `watchlist.csv` et `likes/films.csv`. Les dossiers `deleted/` et `orphaned/` sont ignorés. Chaque film est retrouvé sur TMDB par titre et année. Les films introuvables sont listés sur la page.
3. **À voir** (`/dashboard`) : la recommandation n°1 en grand, puis le reste de la sélection, filtrable par genre. Chaque film affiche son explication.
4. **Mettre à jour** : resynchroniser le RSS, recalculer, réimporter un export ou réafficher les films masqués. Les imports se fusionnent sans doublon.
   - **Synchronisation automatique** du flux RSS (nouvelles entrées de journal, avec note et like) : à l'ouverture de « À voir » si la dernière tentative date de plus de 6 h (lancée après l'envoi de la page avec `after()`, suivie par `SyncStatus`), et chaque jour à 5 h UTC pour tous les comptes via la tâche planifiée Vercel (`vercel.json` → `/api/cron/sync`). Un verrou en base (`syncStartedAt`) empêche deux synchronisations simultanées ; les recommandations ne sont recalculées que si des entrées ont changé.
   - Le flux ne contient ni la watchlist, ni les notes modifiées ou données sans entrée de journal : un rappel propose de refaire un export complet quand le dernier date de plus de 30 jours (« Plus tard » le masque 14 jours).
5. **Profil** (`/profile` → `/u/{pseudo}`) : bannière du film fétiche, statistiques, goûts (genres, réalisateurs, acteurs), puis toute la bibliothèque. Elle est découpée en onglets (notes, vus, coups de cœur, watchlist), filtrable par note depuis l'histogramme, triable et paginée.
6. **Modifier le profil** (`/profile/edit`) : nom, pseudo, bio, pseudo Letterboxd, visibilité de la bibliothèque, film fétiche, email (mot de passe demandé) et mot de passe.
7. **Fiche film** (`/film/{tmdbId}`) : ouverte depuis la bibliothèque, la pellicule d'un ami, un message ou la fiche rapide des recommandations. Affiche ton avis (note, like, date, critique), la raison de la recommandation, les notes et critiques de tes amis (critiques « spoiler » masquées par défaut), le synopsis et la fiche technique. Le film est récupéré sur TMDB s'il n'est pas encore en base.
   - **Critiques** : lues dans le flux RSS (texte de l'entrée, avertissement de spoiler) et dans `reviews.csv` de l'export ; la plus récente est gardée.
8. **Messages** (`/messages`) : conversations entre amis uniquement (vérifié côté serveur à l'envoi et à la lecture), texte et films partagés (« Envoyer à un ami » sur une fiche, ou film de sa bibliothèque joint depuis la conversation). Le fil se met à jour toutes les 4 s quand l'onglet est visible ; la navigation affiche les messages non lus et une notification apparaît dans l'app (vérification toutes les 20 s). Limite de 20 messages par minute.
9. **Amis** (`/friends`) : recherche par nom ou @pseudo, demandes reçues et envoyées, liste d'amis triée par affinité. Sur le profil d'un ami : affinité de notes, films en commun et ses coups de cœur que tu n'as pas vus.
   - La bibliothèque d'un membre n'est visible que par ses amis, sauf s'il la rend publique. Le nom, le pseudo, la bio et le film fétiche restent visibles pour qu'on puisse le trouver.
   - Affinité : `1 − écart moyen des notes / 3` sur les films notés par les deux, calculée à partir de 5 films en commun.

## Architecture

```
src/
├── auth.ts                         Auth.js (Credentials + JWT)
├── actions/                        Server Actions (auth, synchro RSS, recalcul, masquer / déjà vu, profil, amis)
├── app/
│   ├── page.tsx                    Page d'accueil
│   ├── (auth)/login, register      Formulaires
│   ├── (app)/layout.tsx            Coque protégée (requireUser)
│   ├── (app)/dashboard             Recommandations
│   ├── (app)/import                Onboarding / réimport + films introuvables
│   ├── (app)/u/[handle]            Profil public d'un membre (bibliothèque, goûts, affinité)
│   ├── (app)/profile, profile/edit Raccourci vers son profil, réglages du compte
│   ├── (app)/friends               Recherche de membres, demandes, liste d'amis
│   └── api/
│       ├── auth/[...nextauth]
│       ├── import                  POST : upload .zip / .csv → ImportJob
│       └── import/[id]/process     POST : traite le lot suivant et renvoie la progression
├── components/                     UI (ImportPanel, RecoGrid, DashboardActions…)
└── lib/
    ├── tmdb.ts                     Client TMDB : cache en base, limite de concurrence, retry 429
    ├── films.ts                    Cache des films, détails (crédits + mots-clés), correspondance titre+année
    ├── library.ts                  Fusion UserFilm sans doublon
    ├── profile.ts                  Bibliothèque paginée, film fétiche
    ├── friends.ts                  Liens d'amitié, visibilité, affinité
    ├── users.ts                    Pseudos (@handle)
    ├── showcase.ts                 Films à l'affiche (page d'accueil, connexion)
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
| `User` | email unique, `passwordHash` bcrypt, `handle` unique (@pseudo), `bio`, `publicProfile`, `emblemFilmId` (film fétiche) |
| `Friendship` | `requesterId` → `addresseeId`, `status` (`PENDING` / `ACCEPTED`). Une seule ligne par paire : une demande croisée vaut acceptation. |
| `LetterboxdProfile` | pseudo, `lastRssSync`, `lastImportAt` (1–1 avec User) |
| `Film` | `tmdbId` unique, titre, année, affiche, votes, `genres` / `directors` / `cast` / `keywords` en JSON, `detailsFetchedAt` |
| `UserFilm` | (userId, filmId) unique : `watched`, `inWatchlist`, `rating` (0,5–5), `liked`, `watchedAt`, `review` (+ `reviewSpoilers`, `reviewedAt`) |
| `Recommendation` | (userId, filmId) unique : `score`, `reason`, `details` (JSON : %, étiquettes, composantes), `hidden` |
| `TmdbCache` | clé de requête → réponse JSON + `expiresAt` |
| `Message` | `senderId` → `recipientId`, `body` et/ou `filmId` (film partagé), `readAt` |
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

## Identité visuelle

Thème « la salle » : velours bordeaux presque noir (`velvet-*`), texte ivoire (`screen`), accent tungstène (`tungsten`), rouge rideau (`curtain`) pour les pastilles et le vert « sortie de secours » (`exit`) réservé aux confirmations. Les jetons sont dans `src/app/globals.css`.

- Typographies : Big Shoulders pour les titres (utilitaire `marquee`), Hanken Grotesk pour le texte, Courier Prime pour les fiches techniques (`eyebrow`, `meta`).
- Élément signature : l'écran au format Cinémascope 2.39:1 (`ScopeScreen`). Il sert pour la recommandation n°1, la bannière du profil et les cartes d'amis. Il « s'allume » au chargement, sauf si l'utilisateur a demandé à réduire les animations.
- Mobile : barre d'onglets fixée en bas de l'écran.
- Animations (toutes désactivées si l'utilisateur réduit les animations) :
  - `ExpandingScreen` (hero de l'accueil) : l'écran d'affiches remplit la première vue avec l'accroche posée dessus ; au défilement, l'accroche s'efface, l'écran grandit jusqu'aux bords et la salle s'assombrit.
  - `CutReveal` : titres révélés lettre par lettre, en CSS seul.
  - `AnimatedNumber` : chiffres qui défilent (pourcentages, affinité, statistiques), avec [Number Flow](https://number-flow.barvian.me).
  - `Filmstrip` (profil d'un ami) : pellicule 35 mm, les images restent en négatif et se développent au centre.
  - Bandes-annonces (`TrailerFrame`) : sur la fiche film, « Ta séance » et la fiche rapide, l'écran passe du Cinémascope au 16:9 puis lit la bande-annonce YouTube (domaine sans cookies, chargé seulement au clic). Choix via `/movie/{id}/videos` de TMDB (français d'abord, sinon anglais), mis en cache 7 jours.
  - Transitions entre pages (`PageTransition`, React `<ViewTransition>`) : la page quittée s'assombrit, la suivante s'allume ; l'affiche d'un film de la bibliothèque se transforme en celle de sa fiche.
  - Apparition au défilement (utilitaire `reveal`, animations CSS pilotées par le défilement) et inclinaison 3D des affiches au survol avec reflet (`Tilt`, souris uniquement).
