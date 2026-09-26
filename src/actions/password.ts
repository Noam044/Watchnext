"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { getI18n } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { mailAvailable, sendMail } from "@/lib/mail";
import { consumeToken, createResetToken, findValidToken } from "@/lib/password-reset";
import { LIMITS, clearHits, clientIp, recordHits, waitMinutes } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site";

export type ResetState = { ok?: boolean; error?: string; message?: string; email?: string } | undefined;

type AuthTexts = Awaited<ReturnType<typeof getI18n>>["t"]["auth"];

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function resetEmail(a: AuthTexts, name: string | null, link: string) {
  const text = [a.emailGreeting(name), "", a.emailBody, link, "", a.emailIgnore].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a0d0f">
<p>${escape(a.emailGreeting(name))}</p>
<p>${escape(a.emailBody)}</p>
<p><a href="${link}" style="display:inline-block;background:#f2b84b;color:#120809;padding:10px 18px;border-radius:6px;font-weight:bold;text-decoration:none">${escape(a.emailButton)}</a></p>
<p style="font-size:13px;color:#5c363b">${escape(a.emailIgnore)}</p>
</div>`;
  return { subject: a.emailSubject, text, html };
}

/**
 * Demande de lien : la réponse est la même que l'adresse ait un compte ou non (et l'email part
 * après la réponse), pour ne pas révéler qui est inscrit.
 */
export async function requestResetAction(_: ResetState, form: FormData): Promise<ResetState> {
  const a = (await getI18n()).t.auth;
  const parsed = z.email().safeParse(
    String(form.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!parsed.success) return { error: a.errInvalidEmail };
  const email = parsed.data;
  if (!mailAvailable()) return { error: a.resetUnavailable, email };

  const limits = [LIMITS.resetEmail(email), LIMITS.resetIp(await clientIp())];
  const wait = await waitMinutes(limits);
  if (wait) return { error: a.errTooManyAttempts(wait), email };
  await recordHits(...limits);

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (user) {
    const token = await createResetToken(user.id);
    const mail = resetEmail(a, user.name, `${SITE_URL}/reset-password?token=${token}`);
    after(() => sendMail({ to: user.email, ...mail }).catch((e) => console.error("Email de réinitialisation", e)));
  }
  return { ok: true, message: a.resetSent(email) };
}

export async function resetPasswordAction(_: ResetState, form: FormData): Promise<ResetState> {
  const a = (await getI18n()).t.auth;
  const password = String(form.get("password") ?? "");
  if (password.length < 8 || password.length > 128) return { error: a.errPasswordLength };
  const found = await findValidToken(String(form.get("token") ?? ""));
  if (!found) return { error: a.resetInvalid };

  await prisma.user.update({ where: { id: found.id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
  await consumeToken(found.tokenId, found.id);
  // Le compte n'est plus bloqué par d'anciennes tentatives de connexion.
  await clearHits(LIMITS.loginEmail(found.email));
  redirect("/login?reset=1");
}
