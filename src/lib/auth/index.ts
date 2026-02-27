import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: ["openid", "email", "profile"].join(" "),
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (!token.sub) {
        if (user?.id) token.sub = user.id;
        else if (account?.providerAccountId) token.sub = account.providerAccountId;
        else if (typeof (profile as { sub?: unknown } | undefined)?.sub === "string") {
          token.sub = (profile as { sub: string }).sub;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Prefer canonical DB user id by email when available,
        // so returning users are mapped correctly even if token.sub differs.
        const email = session.user.email;
        if (email) {
          const existingUser = db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, email))
            .get();

          if (existingUser) {
            session.user.id = existingUser.id;
            return session;
          }
        }

        if (token.sub) {
          session.user.id = token.sub;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/app/signin",
  },
});
