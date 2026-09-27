import { NextResponse } from "next/server";

export const ssoCorsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

export function handleSsoPreflight(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: ssoCorsHeaders,
  });
}

export function withSsoCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(ssoCorsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}
