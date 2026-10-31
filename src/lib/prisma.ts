import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { getMssqlConfig } from "./db/connection";
import { classifyDatabaseError } from "./db/error-classifier";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaWake: Promise<void> | null | undefined;
  prismaProbe: (() => Promise<unknown>) | undefined;
};

const IDEMPOTENT_OPERATIONS = new Set<string>([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

const WAKE_BUDGET_MS = Number(process.env.DB_WAKE_BUDGET_MS ?? 25_000);
const WAKE_STEPS_MS = [1_000, 2_000, 4_000, 6_000, 8_000];

export class DatabaseWakingError extends Error {
  readonly retryAfterSeconds: number;
  constructor(cause: unknown, retryAfterSeconds = 15) {
    super("Database is waking up from auto-pause. Please retry shortly.");
    this.name = "DatabaseWakingError";
    this.retryAfterSeconds = retryAfterSeconds;
    (this as { cause?: unknown }).cause = cause;
  }
}

export function isDatabaseWaking(err: unknown): err is DatabaseWakingError {
  return err instanceof DatabaseWakingError;
}

function sleepWithJitter(baseMs: number, maxJitterMs = 250): Promise<void> {
  const jitter = Math.floor(Math.random() * maxJitterMs);
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter));
}

/** Probe until the DB answers, or the budget runs out. Permanent errors fail immediately. */
async function wakeDatabase(probe: () => Promise<unknown>): Promise<void> {
  const deadline = performance.now() + WAKE_BUDGET_MS;
  for (let attempt = 0; ; attempt++) {
    try {
      await probe();
      return;
    } catch (err) {
      const classified = classifyDatabaseError(err);
      if (!classified.isTransient) throw err; // bad credentials, missing DB, etc.

      const delay = WAKE_STEPS_MS[Math.min(attempt, WAKE_STEPS_MS.length - 1)];
      if (performance.now() + delay >= deadline) throw new DatabaseWakingError(err);

      console.warn(
        `[Prisma Wake] Probe ${attempt + 1} failed ` +
          `(Code: ${classified.code ?? "N/A"}, AzureResume: ${classified.isAzureResume}). ` +
          `Retrying in ~${delay}ms...`
      );
      await sleepWithJitter(delay, 300);
    }
  }
}

/** Single-flight: concurrent callers in the same instance share one wake-up loop. */
function waitUntilAwake(): Promise<void> {
  const probe = globalForPrisma.prismaProbe;
  if (!probe) return Promise.resolve();
  if (!globalForPrisma.prismaWake) {
    globalForPrisma.prismaWake = wakeDatabase(probe).finally(() => {
      globalForPrisma.prismaWake = null;
    });
  }
  return globalForPrisma.prismaWake;
}

/**
 * Call before critical WRITE paths (e.g. login / session creation) or from
 * instrumentation to overlap DB resume with function boot.
 * Writes are never auto-retried, so this is how you make them safe on a cold DB.
 */
export async function ensureDatabaseAwake(): Promise<void> {
  await waitUntilAwake();
}

function createPrismaClient(): PrismaClient {
  const mssqlConfig = getMssqlConfig();

  const adapter = new PrismaMssql(mssqlConfig, {
    onPoolError: (err) => {
      const classified = classifyDatabaseError(err);
      console.warn(
        `[Prisma MSSQL Adapter] Stale connection dropped from pool (${
          classified.isTransient ? "expected on serverless thaw" : "pool warning"
        }):`,
        (err as Error)?.message || err
      );
    },
    onConnectionError: (err) => {
      const classified = classifyDatabaseError(err);
      console.warn(
        `[Prisma MSSQL Adapter] Connection error (${
          classified.isAzureResume ? "Azure SQL Auto-Resume" : "TCP Transport"
        }):`,
        (err as Error)?.message || err
      );
    },
  });

  const baseClient = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Probe on the UNEXTENDED client so it can never re-enter the extension below.
  globalForPrisma.prismaProbe = () => baseClient.$queryRaw`SELECT 1`;

  return baseClient.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        try {
          return await query(args);
        } catch (error: unknown) {
          const classified = classifyDatabaseError(error);

          // Only transient failures of idempotent reads are retried.
          // Writes, constraint violations, auth errors etc. propagate untouched.
          if (!classified.isTransient || !IDEMPOTENT_OPERATIONS.has(operation)) {
            throw error;
          }

          console.warn(
            `[Prisma Resilient Extension] Transient failure in ${model ?? "raw"}.${operation} ` +
              `(Code: ${classified.code ?? "N/A"}, AzureResume: ${classified.isAzureResume}). ` +
              `Waiting for database...`
          );

          await waitUntilAwake(); // throws DatabaseWakingError if budget exhausted
          return await query(args); // exactly one retry
        }
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

export default prisma;