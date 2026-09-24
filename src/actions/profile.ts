"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { HANDLE_RE, HANDLE_RULES } from "@/lib/users";

export type FormState = { ok?: boolean; error?: string; message?: string } | undefined;

const profileSchema = z.object({
  name: z.string().trim().max(60, "Le nom ne doit pas dépasser 60 caractères."),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .transform((h) => h.replace(/^@/, ""))
    .pipe(z.string().regex(HANDLE_RE, `Pseudo invalide : ${HANDLE_RULES}`)),
  bio: z.string().trim().max(280, "La bio ne doit pas dépasser 280 caractères."),
  letterboxd: z
    .string()
    .trim()
    .transform((u) => u.replace(/^@/, ""))
    .pipe(z.string().regex(/^[A-Za-z0-9_]{0,40}$/, "Pseudo Letterboxd invalide (lettres, chiffres et _).")),
});

export async function updateProfileAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: String(form.get("name") ?? ""),
    handle: String(form.get("handle") ?? ""),
    bio: String(form.get("bio") ?? ""),
    letterboxd: String(form.get("letterboxd") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, handle, bio, letterboxd } = parsed.data;

  const taken = await prisma.user.findFirst({ where: { handle, id: { not: user.id } }, select: { id: true } });
  if (taken) return { error: `Le pseudo @${handle} est déjà pris.` };

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
  return { ok: true, message: "Profil enregistré." };
}

export async function setEmblemAction(filmId: string | null): Promise<ActionResult> {
  const user = await requireUser();
  if (filmId) {
    const owned = await prisma.userFilm.findFirst({ where: { userId: user.id, filmId, watched: true } });
    if (!owned) return { ok: false, error: "Choisis un film que tu as vu." };
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
  const parsed = z.email("Adresse email invalide.").safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data;
  if (email === user.email) return { error: "C'est déjà ton adresse actuelle." };
  if (!(await checkPassword(user.id, String(form.get("password") ?? "")))) {
    return { error: "Mot de passe actuel incorrect." };
  }
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return { error: "Un compte existe déjà avec cette adresse email." };
  }
  await prisma.user.update({ where: { id: user.id }, data: { email } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Adresse email modifiée." };
}

export async function updatePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const next = String(form.get("next") ?? "");
  if (next.length < 8) return { error: "Le nouveau mot de passe doit contenir au moins 8 caractères." };
  if (next.length > 128) return { error: "Le nouveau mot de passe ne doit pas dépasser 128 caractères." };
  if (next !== String(form.get("confirm") ?? "")) return { error: "Les deux mots de passe ne correspondent pas." };
  if (!(await checkPassword(user.id, String(form.get("current") ?? "")))) {
    return { error: "Mot de passe actuel incorrect." };
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  return { ok: true, message: "Mot de passe modifié." };
}
