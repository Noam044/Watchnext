"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { getI18n } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { availableHandle } from "@/lib/users";

export type AuthFormState = { error?: string; fields?: { email?: string; name?: string } } | undefined;

type AuthTexts = Awaited<ReturnType<typeof getI18n>>["t"]["auth"];

const registerSchema = (a: AuthTexts) =>
  z.object({
    name: z.string().trim().max(60).optional(),
    email: z.email(a.errInvalidEmail).transform((e) => e.toLowerCase().trim()),
    password: z.string().min(8, a.errPasswordLength).max(128),
  });

export async function registerAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const raw = {
    name: String(form.get("name") ?? "") || undefined,
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  };
  const a = (await getI18n()).t.auth;
  const parsed = registerSchema(a).safeParse(raw);
  const fields = { email: raw.email, name: raw.name };
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  const { email, password, name } = parsed.data;
  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: a.errEmailTaken, fields };
  }
  await prisma.user.create({
    data: {
      email,
      name: name || null,
      handle: await availableHandle(name || email.split("@")[0]),
      passwordHash: await bcrypt.hash(password, 12),
    },
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
    if (e instanceof AuthError) return { error: (await getI18n()).t.auth.errBadCredentials, fields: { email } };
    throw e; // redirection NEXT_REDIRECT
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
