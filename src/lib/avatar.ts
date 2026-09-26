/** Côté d'une photo de profil enregistrée, en pixels. */
export const AVATAR_SIZE = 256;

/**
 * URL de la photo de profil, versionnée par sa date d'envoi (elle peut donc être gardée
 * en cache indéfiniment), ou null si l'utilisateur n'a pas de photo.
 */
export function avatarUrl(user: { id: string; avatarAt?: Date | null }) {
  return user.avatarAt ? `/api/avatar/${user.id}?v=${user.avatarAt.getTime()}` : null;
}
