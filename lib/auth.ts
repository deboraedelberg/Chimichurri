import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Email y contraseña",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Upsert Google users into our User table (JWT strategy, no adapter)
      if (account?.provider === "google" && user.email) {
        const email = user.email.toLowerCase();
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          await prisma.user.update({
            where: { email },
            data: {
              name: existing.name ?? user.name,
              image: user.image ?? existing.image,
            },
          });
        } else {
          await prisma.user.create({
            data: {
              email,
              name: user.name,
              image: user.image,
              provider: "google",
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      // Al iniciar sesión, resolver el id de la base (los usuarios de Google
      // reciben un cuid propio, no el sub de OAuth). Con trigger "update"
      // (update() de useSession), re-leer el nombre desde la base.
      const email = user?.email ?? (trigger === "update" ? token.email : null);
      if (email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: { id: true, name: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.name = dbUser.name;
        } else if (user) {
          token.id = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.id) session.user.id = token.id;
        if (token.name !== undefined) session.user.name = token.name;
      }
      return session;
    },
  },
};

/** Convenience wrapper for server components and route handlers. */
export function auth() {
  return getServerSession(authOptions);
}
