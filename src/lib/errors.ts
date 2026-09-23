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

/** Erreur dont le message peut être affiché tel quel à l'utilisateur. */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; code?: ErrorCode; error: string };

export function toErrorResult(e: unknown): { ok: false; code?: ErrorCode; error: string } {
  if (e instanceof AppError) return { ok: false, code: e.code, error: e.message };
  console.error(e);
  return { ok: false, error: "Une erreur inattendue est survenue. Réessaie dans un instant." };
}
