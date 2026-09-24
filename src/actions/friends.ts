"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/lib/errors";
import { findFriendship, relationFrom, type Relation } from "@/lib/friends";
import { requireUser } from "@/lib/session";

export type FriendOp = "add" | "accept" | "decline" | "cancel" | "remove";

/** Ajoute, accepte, refuse, annule ou retire un ami. Renvoie le nouveau lien. */
export async function friendAction(targetId: string, op: FriendOp): Promise<ActionResult<{ relation: Relation }>> {
  const me = await requireUser();
  if (targetId === me.id) return { ok: false, error: "Tu ne peux pas t'ajouter toi-même." };
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) return { ok: false, error: "Cet utilisateur n'existe plus." };

  const f = await findFriendship(me.id, targetId);
  const current = relationFrom(me.id, targetId, f);

  switch (op) {
    case "add":
      if (current === "none") {
        await prisma.friendship.create({ data: { requesterId: me.id, addresseeId: targetId } });
      } else if (current === "incoming") {
        // Les deux se sont ajoutés : la demande en attente vaut acceptation.
        await prisma.friendship.update({ where: { id: f!.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
      }
      break;
    case "accept":
      if (current !== "incoming") return { ok: false, error: "Cette demande n'existe plus." };
      await prisma.friendship.update({ where: { id: f!.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
      break;
    case "decline":
    case "cancel":
    case "remove":
      if (f && current === ({ decline: "incoming", cancel: "outgoing", remove: "friends" } as const)[op]) {
        await prisma.friendship.delete({ where: { id: f.id } });
      }
      break;
  }

  revalidatePath("/", "layout");
  const updated = await findFriendship(me.id, targetId);
  return { ok: true, data: { relation: relationFrom(me.id, targetId, updated) } };
}
