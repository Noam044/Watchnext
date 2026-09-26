"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { dictionaries } from "@/i18n/dictionaries";
import { getI18n } from "@/i18n/server";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/lib/errors";
import { findFriendship, relationFrom, type Relation } from "@/lib/friends";
import { sendPush } from "@/lib/push";
import { requireUser } from "@/lib/session";
import { displayName } from "@/lib/users";

export type FriendOp = "add" | "accept" | "decline" | "cancel" | "remove";

/** Ajoute, accepte, refuse, annule ou retire un ami. Renvoie le nouveau lien. */
export async function friendAction(targetId: string, op: FriendOp): Promise<ActionResult<{ relation: Relation }>> {
  const me = await requireUser();
  const txt = (await getI18n()).t.friends;
  if (targetId === me.id) return { ok: false, error: txt.errSelf };
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) return { ok: false, error: txt.errGone };

  const f = await findFriendship(me.id, targetId);
  const current = relationFrom(me.id, targetId, f);
  // Notifications push envoyées après la réponse : demande reçue, ou demande acceptée.
  const notify = (kind: "request" | "accepted") =>
    after(() =>
      sendPush(targetId, (locale) => {
        const t = dictionaries[locale].friends;
        return kind === "request"
          ? {
              title: dictionaries[locale].messages.newFriendRequest,
              body: t.pushRequest(displayName(me)),
              url: "/friends",
              tag: `friend-${me.id}`,
            }
          : {
              title: t.pushAcceptedTitle,
              body: t.pushAccepted(displayName(me)),
              url: `/u/${me.handle}`,
              tag: `friend-${me.id}`,
            };
      }),
    );

  switch (op) {
    case "add":
      if (current === "none") {
        await prisma.friendship.create({ data: { requesterId: me.id, addresseeId: targetId } });
        notify("request");
      } else if (current === "incoming") {
        // Les deux se sont ajoutés : la demande en attente vaut acceptation.
        await prisma.friendship.update({ where: { id: f!.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
        notify("accepted");
      }
      break;
    case "accept":
      if (current !== "incoming") return { ok: false, error: txt.errRequestGone };
      await prisma.friendship.update({ where: { id: f!.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
      notify("accepted");
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
