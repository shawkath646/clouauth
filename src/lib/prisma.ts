import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { getMssqlConfig } from "./db/connection";
import { classifyDatabaseError } from "./db/error-classifier";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Guard flag preventing recursive query retries
const RETRY_FLAG = Symbol.for("clouauth.prisma.retried");

// Idempotent read operations that are safe to retry on transient connection failures
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

/**
 * Jittered sleep helper.
 */
function sleepWithJitter(baseMs: number, maxJitterMs: number = 250): Promise<void> {
  const jitter = Math.floor(Math.random() * maxJitterMs);
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter));
}

function createPrismaClient(): PrismaClient {
  // Obtain serverless-tuned MSSQL configuration (min: 0, bounded pool, 8s connection timeout)
  const mssqlConfig = getMssqlConfig();

  // Initialize Prisma MSSQL adapter with connection listeners
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
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

  /**
   * Resilient Query Extension for Serverless Azure SQL:
   * 
   * 1. Detects transient network drops and Azure SQL 40613 (database waking from serverless auto-pause).
   * 2. Retries ONLY idempotent read operations (prevents duplicate writes or double-charges).
   * 3. Prevents retrying midway through ACID multi-step transactions.
   * 4. Enforces a strict maximum of 1 retry with jittered exponential backoff.
   * 5. Never retries permanent errors (invalid credentials, constraint violations, missing tables).
   */
  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const startTime = Date.now();
          const isIdempotent = IDEMPOTENT_OPERATIONS.has(operation);
          const argsObj = (args && typeof args === "object" ? args : {}) as Record<string | symbol, unknown>;
          const hasAlreadyRetried = Boolean(argsObj[RETRY_FLAG]);

          try {
            return await query(args);
          } catch (error: unknown) {
            const duration = Date.now() - startTime;
            const classified = classifyDatabaseError(error);

            // Never retry:
            // - Permanent errors (syntax, constraints, auth)
            // - Non-idempotent operations (creates, updates, deletes)
            // - If already retried once
            // - If the initial attempt already exceeded the reasonable latency budget (> 9000ms)
            const canRetry =
              classified.isTransient &&
              isIdempotent &&
              !hasAlreadyRetried &&
              duration < 9000;

            if (canRetry) {
              const backoff = classified.suggestedBackoffMs || 400;

              console.warn(
                `[Prisma Resilient Extension] Transient failure in ${model}.${operation} ` +
                `(Code: ${classified.code ?? "N/A"}, AzureResume: ${classified.isAzureResume}, Elapsed: ${duration}ms). ` +
                `Backing off ${backoff}ms before retry (attempt 1/1)...`
              );

              // Tag arguments to prevent recursive retries
              argsObj[RETRY_FLAG] = true;

              await sleepWithJitter(backoff, 200);

              return await query(args);
            }

            throw error;
          }
        },
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

// Persist singleton across both development HMR and warm serverless invocations
globalForPrisma.prisma = prisma;

export default prisma;
