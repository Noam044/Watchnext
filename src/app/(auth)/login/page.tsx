import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { getI18n } from "@/i18n/server";
import { mailAvailable } from "@/lib/mail";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.auth.metaLogin };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { reset } = await searchParams;
  const a = (await getI18n()).t.auth;
  return (
    <AuthForm
      mode="login"
      canResetPassword={mailAvailable()}
      notice={reset === "1" ? a.passwordResetDone : undefined}
    />
  );
}
