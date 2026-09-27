"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { friendAction, type FriendOp } from "@/actions/friends";
import { CheckIcon, PlusIcon, XIcon } from "@/components/icons";
import { toast } from "@/components/toaster";
import { burst, confetti, haptic } from "@/lib/fx";
import type { Relation } from "@/lib/friends";
import { useI18n } from "@/i18n/client";


export function FriendButton({
  userId,
  name,
  relation: initial,
  compact = false,
}: {
  userId: string;
  name: string;
  relation: Relation;
  compact?: boolean;
}) {
  const router = useRouter();
  const [relation, setRelation] = useState(initial);
  const [pending, startTransition] = useTransition();
  const p = useI18n().t.profile;
  // Le lien a pu changer ailleurs sur la page (ex. demande acceptée dans une autre liste).
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setRelation(initial);
  }

  // `e` : clic d'origine ; sa position est relevée tout de suite, le bouton change une fois la réponse reçue.
  const run = (op: FriendOp, e?: React.MouseEvent<HTMLElement>) => {
    const from = e?.currentTarget.getBoundingClientRect();
    startTransition(async () => {
      if (op === "remove" && !confirm(p.confirmRemove(name))) return;
      const res = await friendAction(userId, op);
      if (!res.ok) return toast(res.error, "error");
      setRelation(res.data.relation);
      // Nouvelle amitié : confettis ; demande envoyée : gerbe d'étincelles.
      if (res.data.relation === "friends" && (op === "accept" || op === "add")) {
        confetti({ count: 70 });
        haptic([15, 50, 15, 50, 25]);
      } else if (op === "add") {
        burst(from, { shapes: ["spark", "star"] });
        haptic(10);
      }
      toast(res.data.relation === "friends" && op === "add" ? p.done.accept : p.done[op]);
      router.refresh();
    });
  };

  const size = compact ? "px-3.5 py-1.5 text-xs" : "";

  switch (relation) {
    case "self":
      return null;
    case "none":
      return (
        <button onClick={(e) => run("add", e)} disabled={pending} className={`btn-primary ${size}`}>
          <PlusIcon /> {p.addFriend}
        </button>
      );
    case "outgoing":
      return (
        <button
          onClick={() => run("cancel")}
          disabled={pending}
          className={`btn-ghost group/btn ${size}`}
          title={p.cancelRequestTitle}
        >
          <span className="group-hover/btn:hidden">{p.requestSent}</span>
          <span className="hidden group-hover/btn:inline">{p.cancelRequest}</span>
        </button>
      );
    case "incoming":
      return (
        <div className="flex gap-2">
          <button onClick={(e) => run("accept", e)} disabled={pending} className={`btn-primary ${size}`}>
            <CheckIcon /> {p.accept}
          </button>
          <button onClick={() => run("decline")} disabled={pending} className={`btn-quiet ${size}`}>
            <XIcon /> {p.decline}
          </button>
        </div>
      );
    case "friends":
      return (
        <div className="flex items-center gap-1">
          <span className={`btn cursor-default border border-exit/30 text-exit ${size}`}>
            <CheckIcon className="size-4 animate-pop" /> {p.friends}
          </span>
          {!compact && (
            <button onClick={() => run("remove")} disabled={pending} className="btn-quiet text-xs">
              {p.remove}
            </button>
          )}
        </div>
      );
  }
}
