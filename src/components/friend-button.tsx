"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { friendAction, type FriendOp } from "@/actions/friends";
import { CheckIcon, PlusIcon, XIcon } from "@/components/icons";
import { toast } from "@/components/toaster";
import type { Relation } from "@/lib/friends";

const DONE: Record<FriendOp, string> = {
  add: "Demande d'ami envoyée.",
  accept: "Vous êtes maintenant amis.",
  decline: "Demande refusée.",
  cancel: "Demande annulée.",
  remove: "Retiré de tes amis.",
};

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
  // Le lien a pu changer ailleurs sur la page (ex. demande acceptée dans une autre liste).
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setRelation(initial);
  }

  const run = (op: FriendOp) =>
    startTransition(async () => {
      if (op === "remove" && !confirm(`Retirer ${name} de tes amis ?`)) return;
      const res = await friendAction(userId, op);
      if (!res.ok) return toast(res.error, "error");
      setRelation(res.data.relation);
      toast(res.data.relation === "friends" && op === "add" ? DONE.accept : DONE[op]);
      router.refresh();
    });

  const size = compact ? "px-3.5 py-1.5 text-xs" : "";

  switch (relation) {
    case "self":
      return null;
    case "none":
      return (
        <button onClick={() => run("add")} disabled={pending} className={`btn-primary ${size}`}>
          <PlusIcon /> Ajouter en ami
        </button>
      );
    case "outgoing":
      return (
        <button
          onClick={() => run("cancel")}
          disabled={pending}
          className={`btn-ghost group/btn ${size}`}
          title="Cliquer pour annuler la demande"
        >
          <span className="group-hover/btn:hidden">Demande envoyée</span>
          <span className="hidden group-hover/btn:inline">Annuler la demande</span>
        </button>
      );
    case "incoming":
      return (
        <div className="flex gap-2">
          <button onClick={() => run("accept")} disabled={pending} className={`btn-primary ${size}`}>
            <CheckIcon /> Accepter
          </button>
          <button onClick={() => run("decline")} disabled={pending} className={`btn-quiet ${size}`}>
            <XIcon /> Refuser
          </button>
        </div>
      );
    case "friends":
      return (
        <div className="flex items-center gap-1">
          <span className={`btn cursor-default border border-exit/30 text-exit ${size}`}>
            <CheckIcon /> Amis
          </span>
          {!compact && (
            <button onClick={() => run("remove")} disabled={pending} className="btn-quiet text-xs">
              Retirer
            </button>
          )}
        </div>
      );
  }
}
