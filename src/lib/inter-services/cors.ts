import { NextRequest, NextResponse } from "next/server";

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();

    // 1. Production domain and subdomains: *.clouburstlab.com or clouburstlab.com
    if (host === "clouburstlab.com" || host.endsWith(".clouburstlab.com")) {
      return true;
    }

    // 2. Development origins: localhost or 127.0.0.1
    if (
      process.env.NODE_ENV !== "production" &&
      (host === "localhost" || host === "127.0.0.1")
    ) {
      return true;
    }

    // 3. Additional custom configured origins
    const customOrigins = (process.env.INTERNAL_ALLOWED_ORIGINS || "")
      .split(",")
      .map((o) => o.trim().toLowerCase())
      .filter(Boolean);

    if (customOrigins.includes(origin.toLowerCase()) || customOrigins.includes(host)) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function getInterServiceCorsHeaders(
  request: NextRequest
): Record<string, string> {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, Cookie, X-Requested-With, x-user-id, cache-control",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  } else if (!origin) {
    // Server-to-server calls without an Origin header
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return headers;
}

export function handleInterServicePreflight(request: NextRequest): NextResponse {
  const headers = getInterServiceCorsHeaders(request);
  return new NextResponse(null, {
    status: 204,
    headers,
  });
}

export function withInterServiceCors(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const corsHeaders = getInterServiceCorsHeaders(request);
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}
