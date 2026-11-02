import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { getMssqlConfig } from "./db/connection";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const mssqlConfig = getMssqlConfig();

  const adapter = new PrismaMssql(mssqlConfig, {
    onPoolError: (err) => {
      console.warn("[Prisma MSSQL Adapter] Pool error:", (err as Error)?.message || err);
    },
    onConnectionError: (err) => {
      console.warn("[Prisma MSSQL Adapter] Connection error:", (err as Error)?.message || err);
    },
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
