import "server-only";

/**
 * Intelligent Database Error Classifier for Microsoft SQL Server & Azure SQL Database
 * 
 * Classifies database and network errors into:
 * - TRANSIENT: Recoverable with jittered backoff (e.g. Azure SQL 40613 during auto-resume, TCP drops)
 * - PERMANENT: Fatal / non-recoverable (e.g. invalid credentials, schema mismatch, syntax error)
 */

export type ErrorClassification = "TRANSIENT" | "PERMANENT" | "UNKNOWN";

export interface ClassifiedError {
  classification: ErrorClassification;
  isTransient: boolean;
  isAzureResume: boolean;
  code?: string | number;
  message: string;
  originalError?: unknown;
  suggestedBackoffMs?: number;
}

/**
 * Documented Transient Azure SQL Database & TDS Error Numbers
 * Reference: https://learn.microsoft.com/en-us/azure/azure-sql/database/troubleshoot-common-errors-issues
 */
export const AZURE_SQL_TRANSIENT_NUMBERS = new Set<number>([
  40613, // Database 'xxx' on server 'yyy' is not currently available (Auto-pause resume or failover)
  40197, // The service has encountered an error processing your request. Please try again.
  40501, // The service is currently busy. Retry the request after 10 seconds.
  49918, // Cannot process request. Not enough resources to process request.
  49919, // Cannot process create or update request. Too many operations in progress.
  49920, // Cannot process request. Too many operations to process.
  4221,  // Login to read-secondary failed due to failover.
  10928, // Resource ID: %d. The %s limit for the database is %d and has been reached.
  10929, // Resource ID: %d. The %s minimum guarantee is %d and has been reached.
  1205,  // Transaction deadlock victim (safe to retry if transaction can be re-run)
  10053, // Transport-level error: An established connection was aborted by the software in your host machine.
  10054, // Transport-level error: An existing connection was forcibly closed by the remote host.
  10060, // Transport-level error: A connection attempt failed because the connected party did not properly respond.
]);

/**
 * Documented Permanent Azure SQL & SQL Server Error Numbers (NEVER RETRY)
 */
export const AZURE_SQL_PERMANENT_NUMBERS = new Set<number>([
  18456, // Login failed for user (Invalid credentials)
  4060,  // Cannot open database requested by the login (Database does not exist or access denied)
  208,   // Invalid object name (Table/View does not exist)
  207,   // Invalid column name
  515,   // Cannot insert the value NULL into column
  547,   // The INSERT/UPDATE statement conflicted with the FOREIGN KEY constraint
  2601,  // Cannot insert duplicate key row in object with unique index
  2627,  // Violation of PRIMARY KEY / UNIQUE KEY constraint
  2628,  // String or binary data would be truncated
  245,   // Conversion failed when converting the varchar value to data type
  8114,  // Error converting data type
  8152,  // String or binary data would be truncated
  102,   // Incorrect syntax near
  105,   // Unclosed quotation mark
  156,   // Incorrect syntax near the keyword
  229,   // The %s permission was denied on the object
]);

/**
 * Known TCP/Network error code patterns indicating dropped, stale, or terminated sockets
 */
export const NETWORK_TRANSIENT_CODES = new Set<string>([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ESOCKETTIMEDOUT",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "P2024", // Prisma pool connection acquisition timeout
  "P2028", // Prisma transaction API error
  "P2038", // Prisma DriverAdapterError
]);

/**
 * Case-insensitive string snippets identifying connection and transport failures
 */
const CONNECTION_ERROR_SNIPPETS = [
  "econnreset",
  "econnrefused",
  "etimedout",
  "socket hang up",
  "failed to connect to",
  "connection is closed",
  "connection lost",
  "communication link failure",
  "server closed the connection",
  "read econnreset",
  "timeout: failed to connect",
  "not currently available",
  "the service has encountered an error processing your request",
  "connection pool timeout",
  "timed out fetching a connection from the pool",
];

interface NestedErrorLike {
  code?: string | number;
  number?: number;
  name?: string;
  message?: string;
  originalError?: NestedErrorLike;
  cause?: NestedErrorLike | unknown;
  meta?: {
    code?: string | number;
    message?: string;
    originalCode?: string | number;
    originalMessage?: string;
    driverAdapterError?: {
      code?: string | number;
      message?: string;
      originalCode?: string | number;
      originalMessage?: string;
    };
  };
}

/**
 * Classifies an error thrown by Prisma Client, Prisma MSSQL adapter, or tedious.
 */
export function classifyDatabaseError(error: unknown): ClassifiedError {
  if (!error) {
    return {
      classification: "UNKNOWN",
      isTransient: false,
      isAzureResume: false,
      message: "Unknown error",
    };
  }

  const err = error as NestedErrorLike;
  const message = String(err.message || "").toLowerCase();

  // 1. Extract numerical SQL error code if available across adapter/tedious layers
  const errorNumber =
    typeof err.number === "number"
      ? err.number
      : typeof err.code === "number"
      ? err.code
      : typeof err.originalError?.number === "number"
      ? err.originalError.number
      : typeof err.meta?.originalCode === "number"
      ? err.meta.originalCode
      : typeof err.meta?.driverAdapterError?.originalCode === "number"
      ? err.meta.driverAdapterError.originalCode
      : undefined;

  // 2. Extract string code if available (e.g. 'ECONNRESET', 'ETIMEDOUT', 'P2024')
  const errorCode =
    typeof err.code === "string"
      ? err.code.toUpperCase()
      : typeof err.originalError?.code === "string"
      ? err.originalError.code.toUpperCase()
      : typeof err.meta?.code === "string"
      ? err.meta.code.toUpperCase()
      : typeof err.meta?.driverAdapterError?.code === "string"
      ? String(err.meta.driverAdapterError.code).toUpperCase()
      : undefined;

  // Check 1: Explicit permanent SQL error number
  if (errorNumber !== undefined && AZURE_SQL_PERMANENT_NUMBERS.has(errorNumber)) {
    return {
      classification: "PERMANENT",
      isTransient: false,
      isAzureResume: false,
      code: errorNumber,
      message: err.message || `Permanent SQL error ${errorNumber}`,
      originalError: error,
    };
  }

  // Check 2: Check for Azure SQL Error 40613 (Database resuming / unavailable)
  const is40613 =
    errorNumber === 40613 ||
    message.includes("40613") ||
    message.includes("not currently available. please retry");

  if (is40613) {
    return {
      classification: "TRANSIENT",
      isTransient: true,
      isAzureResume: true,
      code: 40613,
      message: "Azure SQL database is resuming from serverless pause or temporarily unavailable.",
      originalError: error,
      // Azure SQL resume usually completes within 1.5 - 3 seconds once initiated
      suggestedBackoffMs: 1500,
    };
  }

  // Check 3: Other explicit transient Azure SQL error numbers
  if (errorNumber !== undefined && AZURE_SQL_TRANSIENT_NUMBERS.has(errorNumber)) {
    return {
      classification: "TRANSIENT",
      isTransient: true,
      isAzureResume: false,
      code: errorNumber,
      message: err.message || `Transient Azure SQL error ${errorNumber}`,
      originalError: error,
      suggestedBackoffMs: 800,
    };
  }

  // Check 4: Network socket / pool timeout error codes
  if (errorCode && NETWORK_TRANSIENT_CODES.has(errorCode)) {
    return {
      classification: "TRANSIENT",
      isTransient: true,
      isAzureResume: message.includes("failed to connect"),
      code: errorCode,
      message: err.message || `Network transient failure: ${errorCode}`,
      originalError: error,
      suggestedBackoffMs: 500,
    };
  }

  // Check 5: Substring pattern matching on error message
  const hasConnectionSnippet = CONNECTION_ERROR_SNIPPETS.some((snippet) =>
    message.includes(snippet)
  );

  if (hasConnectionSnippet) {
    const isConnectTimeout =
      message.includes("failed to connect") || message.includes("etimedout");
    return {
      classification: "TRANSIENT",
      isTransient: true,
      isAzureResume: isConnectTimeout,
      code: errorCode || errorNumber,
      message: err.message || "Connection transport failure",
      originalError: error,
      suggestedBackoffMs: isConnectTimeout ? 1000 : 400,
    };
  }

  // Default to non-transient to prevent retrying unknown logic errors
  return {
    classification: "PERMANENT",
    isTransient: false,
    isAzureResume: false,
    code: errorCode || errorNumber,
    message: err.message || "Unhandled database error",
    originalError: error,
  };
}

/**
 * Returns true if the given error represents a transient failure that is safe to retry.
 */
export function isTransientDatabaseError(error: unknown): boolean {
  return classifyDatabaseError(error).isTransient;
}
