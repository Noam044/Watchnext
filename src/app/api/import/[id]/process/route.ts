import { NextResponse } from "next/server";
import { processImportBatch } from "@/lib/import";
import { getCurrentUser } from "@/lib/session";
import { errorResponse } from "@/lib/http";
import { getI18n } from "@/i18n/server";

export const maxDuration = 60;

/** Traite le lot suivant d'un import complet et renvoie la progression. */
export async function POST(_req: Request, ctx: RouteContext<"/api/import/[id]/process">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: (await getI18n()).t.common.notSignedIn }, { status: 401 });
  const { id } = await ctx.params;
  try {
    return NextResponse.json(await processImportBatch(user.id, id));
  } catch (e) {
    return errorResponse(e, (await getI18n()).t);
  }
}
