// types/next-auth.d.ts — Augmentation des types NextAuth pour le schéma Store/User

import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id:      string;
      role:    string;
      storeId: string;
    } & DefaultSession["user"];
  }

  interface User {
    id:      string;
    role:    string;
    storeId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id:      string;
    role:    string;
    storeId: string;
  }
}
