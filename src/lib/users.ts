import "server-only";
import { prisma } from "@/lib/db";

export const HANDLE_RE = /^[a-z0-9_]{3,24}$/;
export const HANDLE_RULES = "3 à 24 caractères : lettres minuscules, chiffres ou _.";

export function slugifyHandle(raw: string) {
  const base = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 20);
  return base.length >= 3 ? base : `${base}cine`;
}

/** Premier pseudo libre construit à partir de `seed` (nom, pseudo Letterboxd ou email). */
export async function availableHandle(seed: string) {
  const base = slugifyHandle(seed);
  for (let i = 1; i < 50; i++) {
    const candidate = i === 1 ? base : `${base}_${i}`;
    if (!(await prisma.user.findUnique({ where: { handle: candidate }, select: { id: true } }))) return candidate;
  }
  return `${base}_${Date.now().toString(36)}`;
}

export function displayName(u: { name: string | null; handle: string }) {
  return u.name?.trim() || u.handle;
}
