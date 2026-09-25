import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.auth.metaLogin };
}

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
