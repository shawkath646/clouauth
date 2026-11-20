import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("CRITICAL: DATABASE_URL is not set.");
  process.exit(1);
}

const match = connectionString.match(
  /sqlserver:\/\/([^:]+):(\d+);database=([^;]+);user=([^;]+);password=([^;]+);/
);
if (!match) {
  console.error("CRITICAL: Failed to parse DATABASE_URL.");
  process.exit(1);
}

const [, server, port, database, user, password] = match;

const adapter = new PrismaMssql({
  server,
  port: parseInt(port, 10),
  database,
  user,
  password,
  options: { encrypt: true, trustServerCertificate: true },
});

const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log("🌱 [Seed] Connecting to ClouAuth database...");

  // 1. Find the primary/admin user to assign as app author
  const primaryUser = await prisma.user.findFirst({
    select: { id: true, username: true },
    orderBy: { created_on: "asc" },
  });

  if (!primaryUser) {
    console.error("❌ No users found in database to set as author. Please create an account first.");
    process.exit(1);
  }

  console.log(`👤 Found author user: ${primaryUser.username} (${primaryUser.id})`);

  // 2. Check if Systemify app already exists
  const existingConfig = await prisma.oAuthClientConfig.findUnique({
    where: { client_id: "systemify" },
    include: { app: true },
  });

  const redirectUris = [
    "systemify://oauth2/callback",
    "http://127.0.0.1:18247/callback",
  ];
  const scopes = ["openid", "profile", "email"];

  if (existingConfig) {
    console.log("🔄 Updating existing Systemify client configuration...");
    const updated = await prisma.oAuthClientConfig.update({
      where: { client_id: "systemify" },
      data: {
        client_type: "public",
        token_endpoint_auth_method: "none",
        client_secret_hash: null,
        pkce_required: true,
        is_first_party: true,
        enabled: true,
        redirect_uris: JSON.stringify(redirectUris),
        scopes: JSON.stringify(scopes),
        app: {
          update: {
            name: "Systemify",
            description: "Unified clipboard synchronization and seamless device file transfers across Android and Desktop.",
            website: "https://clouburstlab.com",
          },
        },
      },
      include: { app: true },
    });
    console.log("✅ Successfully updated Systemify OAuth app:", JSON.stringify(updated, null, 2));
  } else {
    console.log("✨ Creating new Systemify OAuth app...");
    const created = await prisma.userApp.create({
      data: {
        name: "Systemify",
        description: "Unified clipboard synchronization and seamless device file transfers across Android and Desktop.",
        website: "https://clouburstlab.com",
        author_id: primaryUser.id,
        oauth: {
          create: {
            client_id: "systemify",
            client_type: "public",
            token_endpoint_auth_method: "none",
            client_secret_hash: null,
            pkce_required: true,
            is_first_party: true,
            enabled: true,
            redirect_uris: JSON.stringify(redirectUris),
            scopes: JSON.stringify(scopes),
          },
        },
      },
      include: { oauth: true },
    });
    console.log("✅ Successfully created Systemify OAuth app:", JSON.stringify(created, null, 2));
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed with error:", err);
  process.exit(1);
});
