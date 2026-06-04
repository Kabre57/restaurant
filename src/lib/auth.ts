// src/lib/auth.ts — Configuration NextAuth avec Credentials provider
// Schéma : Store + User (storeId, role, password bcrypt)

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from '@/lib/db'
import { logger } from "@/lib/logger";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 heures
  },
  pages: {
    signIn: "/login",
    error: "/auth/configuration-error",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id:       true,
              email:    true,
              name:     true,
              role:     true,
              storeId:  true,
              password: true,
            },
          });

          if (!user || !user.password) return null;

          const valid = await bcrypt.compare(credentials.password, user.password);
          if (!valid) return null;

          return {
            id:        user.id,
            email:     user.email,
            name:      user.name,
            role:      user.role,
            storeId:   user.storeId,
          };
        } catch (err) {
          logger.error("[Auth] DB error:", err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id      = user.id;
        token.email   = user.email;
        token.role    = user.role;
        token.storeId = user.storeId;
      }

      // Si storeId est manquant dans le token (par ex. suite à une modification ou session incomplète)
      if (!token.storeId && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { storeId: true, email: true }
          });
          if (!dbUser?.storeId) {
            logger.error(`[AUTH] Utilisateur ${dbUser?.email} (id: ${token.id}) n'a pas de storeId assigné.`);
            throw new Error("Compte mal configuré. Veuillez contacter l'administrateur.");
          }
          token.storeId = dbUser.storeId;
        } catch (error) {
          logger.error("[Auth JWT DB Fetch Error] Impossible de restaurer le storeId:", error);
          throw error;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id      = token.id;
        session.user.email   = token.email;
        session.user.role    = token.role;
        session.user.storeId = token.storeId;

        if (!token.storeId) {
          logger.error("[Auth Session Error] storeId est manquant dans le token de session !");
        }
      }
      return session;
    },
  },
};
