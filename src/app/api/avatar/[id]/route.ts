import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/** Photo de profil d'un membre, réservée aux membres connectés. L'URL change à chaque nouvelle photo. */
export async function GET(_req: Request, ctx: RouteContext<"/api/avatar/[id]">) {
  // Session vérifiée sur le jeton seul (sans requête en base) : une page de profil charge beaucoup d'avatars.
  if (!(await auth())?.user?.id) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  const avatar = await prisma.userAvatar.findUnique({ where: { userId: id }, select: { data: true } });
  if (!avatar) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(avatar.data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
