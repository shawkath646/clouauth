import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as path from "path";
import * as fs from "fs";
import crypto from "crypto";

// Initialize Firebase
let credential;
let projectId = process.env.FIREBASE_PROJECT_ID;

if (process.env.FIREBASE_PRIVATE_KEY) {
  credential = cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
  });
} else {
  const serviceAccountPath = path.resolve(
    process.env.GOOGLE_APPLICATION_CREDENTIALS || "./service-account.json"
  );

  if (!fs.existsSync(serviceAccountPath)) {
    console.error(`CRITICAL: Service account file not found at ${serviceAccountPath}`);
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  credential = cert(serviceAccount);
  projectId = serviceAccount.project_id;
}

if (getApps().length === 0) {
  initializeApp({
    credential,
    projectId,
  });
}

const db = getFirestore();

async function seed() {
  console.log("🌱 [Seed] Connecting to Firebase Firestore...");

  // 1. Find the primary/admin user to assign as app author
  const usersSnap = await db.collection("users").orderBy("created_on", "asc").limit(1).get();

  if (usersSnap.empty) {
    console.error("❌ No users found in database to set as author. Please create an account first.");
    process.exit(1);
  }

  const primaryUserDoc = usersSnap.docs[0];
  const primaryUserData = primaryUserDoc.data();
  console.log(`👤 Found author user: ${primaryUserData.username} (${primaryUserDoc.id})`);

  // 2. Check if Systemify app already exists via oauth_client_ids index
  const indexDoc = await db.collection("oauth_client_ids").doc("systemify").get();

  const redirectUris = [
    "systemify://oauth2/callback",
    "http://127.0.0.1:18247/callback",
  ];
  const scopes = ["openid", "profile", "email"];
  const now = Timestamp.now();

  if (indexDoc.exists) {
    const appId = indexDoc.data()?.appId;
    console.log(`🔄 Updating existing Systemify client configuration (${appId})...`);

    const batch = db.batch();
    batch.update(db.collection("user_apps").doc(appId), {
      name: "Systemify",
      description: "Unified clipboard synchronization and seamless device file transfers across Android and Desktop.",
      website: "https://clouburstlab.com",
      updated_at: now,
    });
    batch.update(db.collection("oauth_clients").doc(appId), {
      client_type: "public",
      token_endpoint_auth_method: "none",
      client_secret_hash: null,
      pkce_required: true,
      is_first_party: true,
      enabled: true,
      redirect_uris: JSON.stringify(redirectUris),
      scopes: JSON.stringify(scopes),
    });
    await batch.commit();
    console.log("✅ Successfully updated Systemify OAuth app!");
  } else {
    console.log("✨ Creating new Systemify OAuth app...");
    const appId = crypto.randomUUID();
    const batch = db.batch();

    batch.set(db.collection("oauth_client_ids").doc("systemify"), {
      appId,
      clientId: "systemify",
      created_at: now,
    });
    batch.set(db.collection("user_apps").doc(appId), {
      id: appId,
      name: "Systemify",
      description: "Unified clipboard synchronization and seamless device file transfers across Android and Desktop.",
      website: "https://clouburstlab.com",
      author_id: primaryUserDoc.id,
      icon: null,
      created_at: now,
      updated_at: now,
    });
    batch.set(db.collection("oauth_clients").doc(appId), {
      app_id: appId,
      client_id: "systemify",
      client_type: "public",
      token_endpoint_auth_method: "none",
      client_secret_hash: null,
      pkce_required: true,
      is_first_party: true,
      enabled: true,
      redirect_uris: JSON.stringify(redirectUris),
      scopes: JSON.stringify(scopes),
    });

    await batch.commit();
    console.log("✅ Successfully created Systemify OAuth app!");
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed with error:", err);
  process.exit(1);
});
