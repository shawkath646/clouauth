const secret = process.env.JWT_SECRET;

if (!secret) {
  if (process.env.npm_lifecycle_event === "build") {
    // Next.js static evaluation during build
    console.warn("JWT_SECRET is not set. Using dummy secret for build phase.");
  } else {
    throw new Error("FATAL: JWT_SECRET environment variable is not set.");
  }
}

export const jwtSecret = new TextEncoder().encode(secret || "dummy_build_secret");
export const getSecret = () => jwtSecret;
