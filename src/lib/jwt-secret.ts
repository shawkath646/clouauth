const secret = process.env.JWT_SECRET;

if (!secret) {
  if (process.env.npm_lifecycle_event === "build") {
    console.warn("JWT_SECRET is not set. Using dummy secret for build phase.");
  } else {
    throw new Error("FATAL: JWT_SECRET environment variable is not set.");
  }
}

export const jwtSecret = new TextEncoder().encode(secret);
export const getSecret = () => jwtSecret;
