// lib/db.ts
import { PrismaClient } from "@prisma/client";

// Prisma Client untuk Next.js
// URL database diambil dari DATABASE_URL di .env (pooled connection)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export default db;
