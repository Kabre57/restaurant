// src/lib/db.ts
// Singleton Prisma Client — évite les connexions multiples en développement (hot reload)
// Utilise require() dynamique pour ne pas planter si @prisma/client n'est pas installé

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientType = any;

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClientType | undefined;
}

function createPrismaClient(): PrismaClientType {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require("@prisma/client");
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
    });
  } catch {
    console.info("[Prisma] @prisma/client not found — DB features disabled");
    return null;
  }
}

export const db: PrismaClientType = global.__prisma ?? (global.__prisma = createPrismaClient());

