import "server-only";
import sql from "mssql";

/**
 * Microsoft SQL Server (AWS RDS) Connection & Pool Configuration
 */

export interface ServerlessPoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
}

export function getServerlessPoolConfig(): ServerlessPoolConfig {
  const isProd = process.env.NODE_ENV === "production";
  const customMax = process.env.MSSQL_POOL_MAX
    ? parseInt(process.env.MSSQL_POOL_MAX, 10)
    : undefined;

  const max = customMax && !isNaN(customMax) ? customMax : isProd ? 10 : 10;

  return {
    min: 0,
    max,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 15000,
    createTimeoutMillis: 15000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 5000,
    createRetryIntervalMillis: 200,
  };
}

/**
 * Parses either a Prisma `sqlserver://` URL or an ADO connection string
 * into a strongly-typed `sql.config` with serverless-tuned pool and timeout parameters.
 */
export function getMssqlConfig(): sql.config {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("CRITICAL: DATABASE_URL environment variable is not defined.");
  }

  let server = "localhost";
  let port = 1433;
  let user = "";
  let password = "";
  let database = "";
  let encrypt = true;
  let trustServerCertificate = false;

  let clean = connectionString.trim();
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim();
  }

  if (clean.startsWith("sqlserver://")) {
    const withoutPrefix = clean.replace("sqlserver://", "");
    const firstSemi = withoutPrefix.indexOf(";");
    const hostPortPart =
      firstSemi === -1 ? withoutPrefix : withoutPrefix.slice(0, firstSemi);
    const paramsPart =
      firstSemi === -1 ? "" : withoutPrefix.slice(firstSemi + 1);

    if (hostPortPart.includes("@")) {
      const [creds, hostPort] = hostPortPart.split("@");
      const [u, p] = creds.split(":");
      user = decodeURIComponent(u || "");
      password = decodeURIComponent(p || "");
      const [h, pt] = hostPort.split(":");
      server = h || "localhost";
      if (pt) port = parseInt(pt, 10);
    } else {
      const [h, pt] = hostPortPart.split(":");
      server = h || "localhost";
      if (pt) port = parseInt(pt, 10);
    }

    const segments = paramsPart.split(";").filter(Boolean);
    for (const segment of segments) {
      const [k, ...v] = segment.split("=");
      const key = k?.trim().toLowerCase();
      const val = v.join("=").trim();
      if (!key) continue;

      if (key === "database" || key === "initial catalog") database = val;
      else if (key === "user" || key === "user id" || key === "uid") user = val;
      else if (key === "password" || key === "pwd") password = val;
      else if (key === "encrypt") encrypt = val.toLowerCase() === "true";
      else if (key === "trustservercertificate") {
        trustServerCertificate = val.toLowerCase() === "true";
      }
    }
  } else {
    // ADO / standard key-value connection string
    const segments = clean.split(";").filter(Boolean);
    for (const segment of segments) {
      const [k, ...v] = segment.split("=");
      const key = k?.trim().toLowerCase();
      const val = v.join("=").trim();
      if (!key) continue;

      if (key === "server" || key === "data source") {
        const s = val.replace(/^tcp:/i, "");
        if (s.includes(",")) {
          const [h, pt] = s.split(",");
          server = h.trim();
          if (pt) port = parseInt(pt.trim(), 10);
        } else if (s.includes(":")) {
          const [h, pt] = s.split(":");
          server = h.trim();
          if (pt) port = parseInt(pt.trim(), 10);
        } else {
          server = s.trim();
        }
      } else if (key === "database" || key === "initial catalog") {
        database = val;
      } else if (key === "user" || key === "user id" || key === "uid") {
        user = val;
      } else if (key === "password" || key === "pwd") {
        password = val;
      } else if (key === "encrypt") {
        encrypt = val.toLowerCase() === "true";
      } else if (key === "trustservercertificate") {
        trustServerCertificate = val.toLowerCase() === "true";
      }
    }
  }

  const poolConfig = getServerlessPoolConfig();

  return {
    server,
    port,
    user,
    password,
    database,
    connectionTimeout: 15000,
    requestTimeout: 30000,
    validateConnection: "socket",
    pool: poolConfig,
    options: {
      encrypt,
      trustServerCertificate,
      enableArithAbort: true,
      connectTimeout: 15000,
      requestTimeout: 30000,
      appName: "ClouAuth",
    },
  };
}

// Global singleton cache across development HMR and warm serverless containers
interface GlobalMssqlScope {
  mssqlPool?: sql.ConnectionPool;
  mssqlConnectingPromise?: Promise<sql.ConnectionPool>;
}

const globalForMssql = globalThis as unknown as GlobalMssqlScope;

/**
 * Returns the active raw MSSQL connection pool singleton if used outside Prisma.
 */
export async function getMssqlPool(): Promise<sql.ConnectionPool> {
  if (globalForMssql.mssqlPool && globalForMssql.mssqlPool.connected) {
    return globalForMssql.mssqlPool;
  }

  if (globalForMssql.mssqlConnectingPromise) {
    return await globalForMssql.mssqlConnectingPromise;
  }

  const config = getMssqlConfig();
  const pool = new sql.ConnectionPool(config);

  pool.on("error", (err: unknown) => {
    console.warn(
      "[MSSQL Pool Warning] Idle connection dropped or background error:",
      (err as Error)?.message || err
    );
    if (globalForMssql.mssqlPool === pool && !pool.connected) {
      globalForMssql.mssqlPool = undefined;
    }
  });

  globalForMssql.mssqlConnectingPromise = pool
    .connect()
    .then((connectedPool) => {
      globalForMssql.mssqlPool = connectedPool;
      globalForMssql.mssqlConnectingPromise = undefined;
      return connectedPool;
    })
    .catch((err) => {
      globalForMssql.mssqlConnectingPromise = undefined;
      globalForMssql.mssqlPool = undefined;
      throw err;
    });

  return await globalForMssql.mssqlConnectingPromise;
}

/**
 * Safely closes and flushes an evicted or stale connection pool.
 */
export async function flushMssqlPool(): Promise<void> {
  const pool = globalForMssql.mssqlPool;
  globalForMssql.mssqlPool = undefined;
  globalForMssql.mssqlConnectingPromise = undefined;

  if (pool) {
    try {
      if (pool.connected) {
        await pool.close();
      }
    } catch {
      // Ignore teardown errors during emergency cleanup
    }
  }
}

/**
 * Pre-flight health check ping. Executes a lightweight `SELECT 1` probe.
 */
export async function pingConnection(pool: sql.ConnectionPool): Promise<boolean> {
  try {
    const request = pool.request();
    await request.query("SELECT 1 AS [health_probe]");
    return true;
  } catch {
    return false;
  }
}
