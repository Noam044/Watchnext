"use client";

import { toast } from "@/components/toaster";
import { useI18n } from "@/i18n/client";

export function CopyHandle({ handle }: { handle: string }) {
  const f = useI18n().t.friends;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${location.origin}/u/${handle}`);
          toast(f.linkCopied);
        } catch {
          toast(f.copyFailed, "error");
        }
      }}
      className="chip font-mono"
      title={f.copyTitle}
    >
      @{handle}
    </button>
  );
}
