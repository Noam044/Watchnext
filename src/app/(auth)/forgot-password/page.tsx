import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/password-reset-forms";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.auth.metaForgot };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
