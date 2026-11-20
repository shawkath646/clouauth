import { connection } from "next/server";
import { GET as jwksGet, OPTIONS as jwksOptions } from "../jwks/route";

export function OPTIONS() {
  return jwksOptions();
}

export async function GET() {
  await connection();
  return jwksGet();
}
