"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons";

/** Retour à la page précédente, ou à « À voir » si on arrive directement sur la page. */
export function BackButton({ label = "Retour" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/dashboard"))}
      className="btn-quiet -ml-3"
    >
      <ArrowLeftIcon /> {label}
    </button>
  );
}
