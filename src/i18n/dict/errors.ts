import { pair } from "@/i18n/config";

type P = Record<string, string | number>;
/** Toutes les entrées ont la même signature, qu'elles utilisent des valeurs ou non. */
const msg = (f: (p: P) => string) => f;

/** Messages des erreurs levées côté serveur (AppError), par clé. */
export const errors = pair(
  {
    tmdbKeyMissing: msg(() => "La clé TMDB (TMDB_API_KEY) n'est pas configurée sur le serveur."),
    tmdbKeyInvalid: msg(() => "La clé TMDB est invalide ou révoquée. Vérifie TMDB_API_KEY."),
    tmdbUnavailable: msg(() => "TMDB ne répond pas pour le moment. Réessaie dans quelques minutes."),
    tmdbStatus: msg((p) => `TMDB a renvoyé une erreur (${p.status}).`),
    tmdbQuota: msg(
      () => "Le quota de requêtes TMDB est atteint. Patiente une minute puis relance : la progression est conservée.",
    ),
    importNotFound: msg(() => "Import introuvable."),
    zipUnreadable: msg(() => "L'archive .zip est illisible ou corrompue."),
    csvInvalid: msg((p) => `Le fichier « ${p.file} » n'est pas un CSV valide (ligne ${p.row}).`),
    notLetterboxdFile: msg(
      (p) => `« ${p.file} » ne ressemble pas à un export Letterboxd (colonnes Name et Year manquantes).`,
    ),
    noUsableFile: msg(
      (p) =>
        `Aucun fichier exploitable trouvé. Envoie l'archive .zip de l'export ou au moins watched.csv, ratings.csv, diary.csv ou watchlist.csv.${
          p.unknown ? ` Fichiers non reconnus : ${p.unknown}.` : ""
        }`,
    ),
    noFilms: msg(() => "L'export ne contient aucun film."),
    noFileReceived: msg(() => "Aucun fichier reçu."),
    notZipOrCsv: msg((p) => `« ${p.file} » n'est ni un .zip ni un .csv.`),
    fileTooLarge: msg(() => "Fichier trop volumineux (25 Mo maximum)."),
    notEnoughData: msg(
      (p) =>
        `Il faut au moins ${p.min} films vus pour calculer des recommandations. Importe ton historique Letterboxd.`,
    ),
    lbInvalidUsername: msg(() => "Ce pseudo Letterboxd n'est pas valide (lettres, chiffres et _ uniquement)."),
    lbFeedUnreadable: msg(() => "Le flux RSS Letterboxd est illisible."),
    lbNotRss: msg(() => "La réponse de Letterboxd n'est pas un flux RSS valide."),
    lbUnreachable: msg(() => "Impossible de joindre Letterboxd. Réessaie dans quelques instants."),
    lbUserNotFound: msg((p) => `Aucun profil Letterboxd public ne correspond au pseudo « ${p.username} ».`),
    lbRefused: msg((p) => `Letterboxd a refusé la requête (${p.status}). Réessaie plus tard.`),
    lbEmptyFeed: msg(
      () => "Le flux de ce profil ne contient aucun film (journal vide ou privé). Essaie l'import complet.",
    ),
    internal: msg(() => "Erreur interne du serveur."),
  },
  {
    tmdbKeyMissing: msg(() => "The TMDB key (TMDB_API_KEY) is not configured on the server."),
    tmdbKeyInvalid: msg(() => "The TMDB key is invalid or revoked. Check TMDB_API_KEY."),
    tmdbUnavailable: msg(() => "TMDB isn't responding right now. Try again in a few minutes."),
    tmdbStatus: msg((p) => `TMDB returned an error (${p.status}).`),
    tmdbQuota: msg(
      () => "The TMDB request quota has been reached. Wait a minute and try again: your progress is kept.",
    ),
    importNotFound: msg(() => "Import not found."),
    zipUnreadable: msg(() => "The .zip archive is unreadable or corrupted."),
    csvInvalid: msg((p) => `“${p.file}” is not a valid CSV file (line ${p.row}).`),
    notLetterboxdFile: msg((p) => `“${p.file}” doesn't look like a Letterboxd export (missing Name and Year columns).`),
    noUsableFile: msg(
      (p) =>
        `No usable file found. Send the export .zip archive, or at least watched.csv, ratings.csv, diary.csv or watchlist.csv.${
          p.unknown ? ` Unrecognised files: ${p.unknown}.` : ""
        }`,
    ),
    noFilms: msg(() => "The export doesn't contain any film."),
    noFileReceived: msg(() => "No file received."),
    notZipOrCsv: msg((p) => `“${p.file}” is neither a .zip nor a .csv file.`),
    fileTooLarge: msg(() => "File too large (25 MB maximum)."),
    notEnoughData: msg(
      (p) => `At least ${p.min} watched films are needed to compute recommendations. Import your Letterboxd history.`,
    ),
    lbInvalidUsername: msg(() => "This Letterboxd username isn't valid (letters, numbers and _ only)."),
    lbFeedUnreadable: msg(() => "The Letterboxd RSS feed is unreadable."),
    lbNotRss: msg(() => "Letterboxd's response is not a valid RSS feed."),
    lbUnreachable: msg(() => "Couldn't reach Letterboxd. Try again in a moment."),
    lbUserNotFound: msg((p) => `No public Letterboxd profile matches the username “${p.username}”.`),
    lbRefused: msg((p) => `Letterboxd refused the request (${p.status}). Try again later.`),
    lbEmptyFeed: msg(
      () => "This profile's feed doesn't contain any film (empty or private diary). Try the full import.",
    ),
    internal: msg(() => "Internal server error."),
  },
);
