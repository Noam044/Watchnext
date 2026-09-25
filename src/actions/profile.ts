"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getI18n } from "@/i18n/server";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { HANDLE_RE } from "@/lib/users";

export type FormState = { ok?: boolean; error?: string; message?: string } | undefined;

type SettingsTexts = Awaited<ReturnType<typeof getI18n>>["t"]["settings"];

const profileSchema = (s: SettingsTexts) =>
  z.object({
    name: z.string().trim().max(60, s.errName),
    handle: z
      .string()
      .trim()
      .toLowerCase()
      .transform((h) => h.replace(/^@/, ""))
      .pipe(z.string().regex(HANDLE_RE, s.errHandle)),
    bio: z.string().trim().max(280, s.errBio),
    letterboxd: z
      .string()
      .trim()
      .transform((u) => u.replace(/^@/, ""))
      .pipe(z.string().regex(/^[A-Za-z0-9_]{0,40}$/, s.errLetterboxd)),
  });

export async function updateProfileAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const s = (await getI18n()).t.settings;
  const parsed = profileSchema(s).safeParse({
    name: String(form.get("name") ?? ""),
    handle: String(form.get("handle") ?? ""),
    bio: String(form.get("bio") ?? ""),
    letterboxd: String(form.get("letterboxd") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, handle, bio, letterboxd } = parsed.data;

  const taken = await prisma.user.findFirst({ where: { handle, id: { not: user.id } }, select: { id: true } });
  if (taken) return { error: s.errHandleTaken(handle) };

  await prisma.user.update({
    where: { id: user.id },
    data: { name: name || null, handle, bio: bio || null, publicProfile: form.get("publicProfile") === "on" },
  });
  await prisma.letterboxdProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, username: letterboxd || null },
    update: { username: letterboxd || null },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: s.profileSaved };
}

export async function setEmblemAction(filmId: string | null): Promise<ActionResult> {
  const user = await requireUser();
  if (filmId) {
    const owned = await prisma.userFilm.findFirst({ where: { userId: user.id, filmId, watched: true } });
    if (!owned) return { ok: false, error: (await getI18n()).t.settings.errEmblemNotSeen };
  }
  await prisma.user.update({ where: { id: user.id }, data: { emblemFilmId: filmId } });
  revalidatePath("/", "layout");
  return { ok: true };
}

async function checkPassword(userId: string, password: string) {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  return !!row && (await bcrypt.compare(password, row.passwordHash));
}

export async function updateEmailAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const { t } = await getI18n();
  const s = t.settings;
  const parsed = z.email(t.auth.errInvalidEmail).safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data;
  if (email === user.email) return { error: s.errSameEmail };
  if (!(await checkPassword(user.id, String(form.get("password") ?? "")))) {
    return { error: s.errWrongPassword };
  }
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return { error: t.auth.errEmailTaken };
  }
  await prisma.user.update({ where: { id: user.id }, data: { email } });
  revalidatePath("/", "layout");
  return { ok: true, message: s.emailChanged };
}

export async function updatePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const s = (await getI18n()).t.settings;
  const next = String(form.get("next") ?? "");
  if (next.length < 8) return { error: s.errPasswordShort };
  if (next.length > 128) return { error: s.errPasswordLong };
  if (next !== String(form.get("confirm") ?? "")) return { error: s.errPasswordMismatch };
  if (!(await checkPassword(user.id, String(form.get("current") ?? "")))) {
    return { error: s.errWrongPassword };
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  return { ok: true, message: s.passwordChanged };
}
