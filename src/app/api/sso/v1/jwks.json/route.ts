import { NextResponse } from "next/server";
import { handleError } from "@/utils/error";
import { getActivePublicJwks } from "@/lib/sso/signing-keys";
import { handleSsoPreflight, withSsoCors } from "@/lib/sso/cors";

export function OPTIONS() {
  return handleSsoPreflight();
}

export async function GET() {
  try {
    const jwks = await getActivePublicJwks();

    const response = NextResponse.json(
      { keys: jwks },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      }
    );

    return withSsoCors(response);
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute GET");
    return withSsoCors(NextResponse.json({ error: em }, { status: 500 }));
  }
}
