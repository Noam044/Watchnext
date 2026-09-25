"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons";
import { useI18n } from "@/i18n/client";

/** Retour à la page précédente, ou à « À voir » si on arrive directement sur la page. */
export function BackButton({ label }: { label?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/dashboard"))}
      className="btn-quiet -ml-3"
    >
      <ArrowLeftIcon /> {label ?? t.common.back}
    </button>
  );
}
