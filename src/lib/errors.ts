import { dictionaries, type Dictionary } from "@/i18n/dictionaries";

export type ErrorCode =
  | "TMDB_QUOTA"
  | "TMDB_AUTH"
  | "TMDB_UNAVAILABLE"
  | "LB_INVALID_USERNAME"
  | "LB_USER_NOT_FOUND"
  | "LB_EMPTY_FEED"
  | "LB_UNAVAILABLE"
  | "CSV_INVALID"
  | "FILE_TOO_LARGE"
  | "NOT_ENOUGH_DATA"
  | "NOT_FOUND"
  | "UNAUTHORIZED";

export type ErrorKey = keyof Dictionary["errors"];
export type ErrorParams = Record<string, string | number>;

/**
 * Erreur affichable à l'utilisateur. Elle porte une clé de traduction (et ses valeurs) :
 * le message est rédigé dans la langue de l'utilisateur au moment de le renvoyer.
 * `message` reste en français pour les journaux serveur.
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public key: ErrorKey,
    public params: ErrorParams = {},
    public status = 400,
  ) {
    super(dictionaries.fr.errors[key](params));
    this.name = "AppError";
  }

  /** Forme enregistrable en base (ex. dernière erreur de synchronisation), traduite à l'affichage. */
  serialize() {
    return JSON.stringify({ key: this.key, params: this.params });
  }
}

export function translateError(e: AppError, t: Dictionary) {
  return t.errors[e.key](e.params);
}

/** Erreur enregistrée en base : JSON { key, params } (ou ancien message en clair, affiché tel quel). */
export function describeStoredError(raw: string | null, t: Dictionary) {
  if (!raw) return null;
  if (raw.startsWith("{")) {
    try {
      const { key, params } = JSON.parse(raw) as { key: string; params?: ErrorParams };
      if (key in t.errors) return t.errors[key as ErrorKey](params ?? {});
    } catch {
      // ancien format : message en clair
    }
  }
  return raw;
}

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; code?: ErrorCode; error: string };

export function toErrorResult(e: unknown, t: Dictionary): { ok: false; code?: ErrorCode; error: string } {
  if (e instanceof AppError) return { ok: false, code: e.code, error: translateError(e, t) };
  console.error(e);
  return { ok: false, error: t.common.unexpectedError };
}
