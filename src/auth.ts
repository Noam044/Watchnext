import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { LIMITS, clearHits, clientIp, recordHits, waitMinutes } from "@/lib/rate-limit";

/** Trop d'essais de mot de passe récents pour ce compte ou depuis cette adresse. */
export class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

const credentialsSchema = z.object({
  email: z.email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      // Utilisé par le formulaire comme par l'URL /api/auth/callback/credentials : la limite d'essais est donc ici.
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const byEmail = LIMITS.loginEmail(parsed.data.email);
        const byIp = LIMITS.loginIp(await clientIp());
        if (await waitMinutes([byEmail, byIp])) throw new TooManyAttempts();

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
          await recordHits(byEmail, byIp);
          return null;
        }
        await clearHits(byEmail);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
