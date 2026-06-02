// src/lib/auth.ts — Configuration NextAuth avec Credentials provider
// Schéma : Store + User (storeId, role, password bcrypt)

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 heures
  },
  pages: {
    signIn: "/login",
    error: "/login",
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
          console.error("[Auth] DB error:", err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      console.log("[NextAuth Callback JWT] Avant :", { token, user });
      if (user) {
        token.id      = user.id;
        token.role    = (user as any).role;
        token.storeId = (user as any).storeId;
      }

      // Si storeId est manquant dans le token (par ex. suite à une modification ou session incomplète)
      if (!token.storeId && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { storeId: true }
          });
          if (dbUser?.storeId) {
            token.storeId = dbUser.storeId;
          } else {
            console.error(`[Auth JWT Error] L'utilisateur ${token.email || token.id} n'a pas de storeId associé.`);
            // Fallback : Assigner le premier magasin disponible
            const firstStore = await prisma.store.findFirst({ select: { id: true } });
            if (firstStore) {
              console.log(`[Auth JWT Fallback] Store par défaut assigné : ${firstStore.id}`);
              token.storeId = firstStore.id;
              // Mettre à jour l'utilisateur en base de données pour persister la correction
              await prisma.user.update({
                where: { id: token.id },
                data: { storeId: firstStore.id }
              });
            }
          }
        } catch (error) {
          console.error("[Auth JWT DB Fetch Error] Impossible de restaurer le storeId:", error);
        }
      }
      console.log("[NextAuth Callback JWT] Après :", token);
      return token;
    },

    async session({ session, token }) {
      console.log("[NextAuth Callback Session] Avant :", { session, token });
      if (session.user) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          storeId: token.storeId as string,
        } as any;
        (session as any).storeId = token.storeId;
        (session as any).role = token.role;
        (session as any).userId = token.id;

        if (!token.storeId) {
          console.error("[Auth Session Error] storeId est manquant dans le token de session !");
        }
      }
      console.log("[NextAuth Callback Session] Après :", session);
      return session;
    },
  },
};
