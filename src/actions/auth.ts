"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";

export type AuthFormState = { error?: string; fields?: { email?: string; name?: string } } | undefined;

const registerSchema = z.object({
  name: z.string().trim().max(60).optional(),
  email: z.email("Adresse email invalide.").transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères.").max(128),
});

export async function registerAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const raw = {
    name: String(form.get("name") ?? "") || undefined,
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  };
  const parsed = registerSchema.safeParse(raw);
  const fields = { email: raw.email, name: raw.name };
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  const { email, password, name } = parsed.data;
  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "Un compte existe déjà avec cette adresse email.", fields };
  }
  await prisma.user.create({
    data: { email, name: name || null, passwordHash: await bcrypt.hash(password, 12) },
  });
  await signIn("credentials", { email, password, redirectTo: "/import?welcome=1" });
}

export async function loginAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get("email") ?? "");
  try {
    await signIn("credentials", {
      email,
      password: String(form.get("password") ?? ""),
      redirectTo: "/dashboard",
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Email ou mot de passe incorrect.", fields: { email } };
    throw e; // redirection NEXT_REDIRECT
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
