import "server-only";
import { getEnv } from "@/utils/env.server";

const rawSecret = getEnv("JWT_SECRET", true);

if (!rawSecret) {
  if (
    getEnv("npm_lifecycle_event", true) === "build" ||
    getEnv("NODE_ENV", true) === "test"
  ) {
    console.warn("JWT_SECRET is not set. Using dummy secret for build phase.");
  } else {
    throw new Error("FATAL: JWT_SECRET environment variable is not set.");
  }
}

export const jwtSecret = new TextEncoder().encode(
  rawSecret || "build-dummy-jwt-secret-min-32-bytes"
);

export const getSecret = (): Uint8Array => jwtSecret;
