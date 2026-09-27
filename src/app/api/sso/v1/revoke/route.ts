import { NextRequest, NextResponse } from "next/server";
import { revokeOAuthSession } from "@/lib/session";
import { handleError } from "@/utils/error";
import { handleSsoPreflight, withSsoCors } from "@/lib/sso/cors";

export function OPTIONS() {
  return handleSsoPreflight();
}

export async function POST(request: NextRequest) {
  try {
    let token: string | null = null;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      token = formData.get("token") as string;
    } else {
      const json = await request.json().catch(() => ({}));
      token = json?.token || null;
    }

    if (!token) {
      return withSsoCors(
        NextResponse.json(
          { error: "invalid_request", error_description: "Token is required." },
          { status: 400 }
        )
      );
    }

    await revokeOAuthSession(token);
    // RFC 7009: Revoke endpoint MUST respond with 200 even if token is invalid
    return withSsoCors(new NextResponse(null, { status: 200 }));
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute POST");
    return withSsoCors(
      NextResponse.json(
        { error: "server_error", error_description: em },
        { status: 500 }
      )
    );
  }
}
