import "server-only";
import sql from "mssql";
import { getMssqlPool, flushMssqlPool, pingConnection } from "./connection";
import { classifyDatabaseError, isTransientDatabaseError } from "./error-classifier";

export { isTransientDatabaseError };

/**
 * Backward compatibility alias for isTransientDatabaseError.
 */
export function isConnectionError(error: unknown): boolean {
  return isTransientDatabaseError(error);
}

export interface QueryOptions {
  /**
   * Maximum retry attempts for transient errors.
   * Defaults to 1 (at most one retry).
   */
  maxRetries?: number;
  /**
   * Whether to run a pre-flight probe (`SELECT 1`) before query execution.
   * Default: false (avoids adding round-trips on every request).
   */
  preflightCheck?: boolean;
  /**
   * Request correlation ID for structured observability.
   */
  correlationId?: string;
  /**
   * Optional custom pool provider for dependency injection and testing.
   */
  poolProvider?: () => Promise<sql.ConnectionPool>;
  /**
   * Optional pool flusher for dependency injection and testing.
   */
  poolFlusher?: () => Promise<void>;
}

/**
 * Sleeps for a given duration in milliseconds with random jitter.
 */
function sleepWithJitter(baseMs: number, maxJitterMs: number = 200): Promise<void> {
  const jitter = Math.floor(Math.random() * maxJitterMs);
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter));
}

/**
 * Executes a database operation with intelligent transient error recovery.
 * 
 * Safety invariants:
 * - Permanent errors (syntax, constraints, auth) are NEVER retried.
 * - Non-idempotent writes should not be retried blindly.
 * - Uses bounded jittered backoff.
 * - Maximum retries bounded to 1 (or 2 if Azure SQL 40613 auto-resume is explicitly detected).
 */
export async function executeResilientQuery<T>(
  operation: (pool: sql.ConnectionPool) => Promise<T>,
  options: QueryOptions = {}
): Promise<T> {
  const maxRetries = Math.min(options.maxRetries ?? 1, 2);
  const usePreflight = options.preflightCheck ?? false;
  const correlationId = options.correlationId || "req_db";
  const acquirePool = options.poolProvider ?? getMssqlPool;
  const flushPool = options.poolFlusher ?? flushMssqlPool;

  let pool = await acquirePool();

  if (usePreflight) {
    const isAlive = await pingConnection(pool);
    if (!isAlive) {
      console.warn(
        `[${correlationId}] Pre-flight check failed on thawed pool. Flushing...`
      );
      await flushPool();
      pool = await acquirePool();
    }
  }

  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await operation(pool);
    } catch (error: unknown) {
      const classified = classifyDatabaseError(error);

      if (classified.isTransient && attempt < maxRetries) {
        attempt++;
        const backoff = classified.suggestedBackoffMs || 400;

        console.warn(
          `[${correlationId}] Caught transient database error on attempt ${attempt}/${maxRetries} (Code: ${
            classified.code || "N/A"
          }, AzureResume: ${classified.isAzureResume}): ${classified.message}. Backing off ${backoff}ms...`
        );

        // Flush pool to evict broken socket
        await flushPool();
        await sleepWithJitter(backoff, 100);

        // Re-acquire fresh connection pool
        pool = await acquirePool();
        continue;
      }

      throw error;
    }
  }

  throw new Error(`[${correlationId}] Query execution exceeded maximum retries.`);
}

/**
 * Parameterized SQL Query Helper.
 */
export async function query<T = Record<string, unknown>>(
  commandText: string,
  parameters?: Record<string, unknown>,
  options: QueryOptions = {}
): Promise<sql.IResult<T>> {
  return await executeResilientQuery(async (pool) => {
    const request = pool.request();

    if (parameters) {
      for (const [key, value] of Object.entries(parameters)) {
        if (value !== undefined) {
          request.input(key, value);
        }
      }
    }

    return await request.query<T>(commandText);
  }, options);
}

/**
 * Executes a query and returns the first record, or null if none found.
 */
export async function queryRow<T = Record<string, unknown>>(
  commandText: string,
  parameters?: Record<string, unknown>,
  options: QueryOptions = {}
): Promise<T | null> {
  const result = await query<T>(commandText, parameters, options);
  return result.recordset && result.recordset.length > 0
    ? result.recordset[0]
    : null;
}

/**
 * Executes a query and returns the array of records.
 */
export async function queryRows<T = Record<string, unknown>>(
  commandText: string,
  parameters?: Record<string, unknown>,
  options: QueryOptions = {}
): Promise<T[]> {
  const result = await query<T>(commandText, parameters, options);
  return result.recordset || [];
}
