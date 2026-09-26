import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

const TOKEN_TTL = 60 * 60 * 1000; // 1 h

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Nouveau lien de réinitialisation : le jeton n'est envoyé que par email, la base n'en garde que
 * l'empreinte. Les liens précédents de l'utilisateur sont annulés.
 */
export async function createResetToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash: hash(token), expiresAt: new Date(Date.now() + TOKEN_TTL) },
    }),
  ]);
  return token;
}

/** Jeton valide (ni expiré, ni déjà utilisé) → identifiant et email de l'utilisateur. */
export async function findValidToken(token: string) {
  if (!token || token.length > 100) return null;
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hash(token) },
    select: { id: true, usedAt: true, expiresAt: true, user: { select: { id: true, email: true } } },
  });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  return { tokenId: row.id, ...row.user };
}

/** Le jeton ne sert qu'une fois ; les autres liens de l'utilisateur sont supprimés. */
export async function consumeToken(tokenId: string, userId: string) {
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.deleteMany({ where: { userId, id: { not: tokenId } } }),
  ]);
}
