"use client";

import { toast } from "@/components/toaster";

export function CopyHandle({ handle }: { handle: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${location.origin}/u/${handle}`);
          toast("Lien de ton profil copié.");
        } catch {
          toast("Copie impossible : sélectionne le pseudo à la main.", "error");
        }
      }}
      className="chip font-mono"
      title="Copier le lien de mon profil"
    >
      @{handle}
    </button>
  );
}
