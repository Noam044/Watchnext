import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/password-reset-forms";
import { getI18n } from "@/i18n/server";
import { findValidToken } from "@/lib/password-reset";

export async function generateMetadata(): Promise<Metadata> {
  // Le jeton est dans l'URL : la page ne doit pas le transmettre à d'autres sites.
  return { title: (await getI18n()).t.auth.metaReset, referrer: "no-referrer", robots: { index: false } };
}

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";
  const a = (await getI18n()).t.auth;

  if (!(await findValidToken(token))) {
    return (
      <div className="space-y-4">
        <h1 className="marquee text-4xl">{a.resetTitle}</h1>
        <p role="alert" className="rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
          {a.resetInvalid}
        </p>
        <Link href="/forgot-password" className="btn-primary w-full">
          {a.requestNewLink}
        </Link>
      </div>
    );
  }
  return <ResetPasswordForm token={token} />;
}
