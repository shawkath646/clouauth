import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as path from "path";
import * as fs from "fs";
import crypto from "crypto";
import * as argon2 from "@node-rs/argon2";

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

const CLIENT_ID = process.env.CLIENT_ID || "cbl_2ed42a6a5ac71a045388a294";
const CLIENT_SECRET = process.env.CLIENT_SECRET || "cbl_sec_a51dae0611feae85203b97ec080e3d17859a2580c8b54d74";
const REDIRECT_URI = "http://localhost:3001/callback";

async function seedTestApp() {
  console.log("🌱 [Seed] Setting up test OAuth application in Firestore...");

  // 1. Find the primary author user
  const usersSnap = await db.collection("users").orderBy("created_on", "asc").limit(1).get();
  if (usersSnap.empty) {
    console.error("❌ No users found in database to set as author.");
    process.exit(1);
  }

  const primaryUserDoc = usersSnap.docs[0];
  console.log(`👤 Author: ${primaryUserDoc.data().username} (${primaryUserDoc.id})`);

  // 2. Hash the client secret with Argon2id
  const secretHash = await argon2.hash(CLIENT_SECRET, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
    algorithm: 2,
  });

  const now = Timestamp.now();
  const indexDoc = await db.collection("oauth_client_ids").doc(CLIENT_ID).get();

  const redirectUris = [REDIRECT_URI];
  const scopes = ["openid", "profile", "email"];

  if (indexDoc.exists) {
    const appId = indexDoc.data()?.appId;
    console.log(`🔄 Updating existing test client (${CLIENT_ID} / ${appId})...`);

    const batch = db.batch();
    batch.update(db.collection("user_apps").doc(appId), {
      name: "OAuth Test Client",
      description: "Localhost test client for OpenID Connect and OAuth 2.0 flow testing.",
      website: "http://localhost:3001",
      updated_at: now,
    });
    batch.update(db.collection("oauth_clients").doc(appId), {
      client_type: "confidential",
      token_endpoint_auth_method: "client_secret_post",
      client_secret_hash: secretHash,
      pkce_required: true,
      is_first_party: false,
      enabled: true,
      redirect_uris: JSON.stringify(redirectUris),
      scopes: JSON.stringify(scopes),
    });
    await batch.commit();
    console.log("✅ Successfully updated OAuth Test Client!");
  } else {
    console.log(`✨ Creating new OAuth Test Client (${CLIENT_ID})...`);
    const appId = crypto.randomUUID();
    const batch = db.batch();

    batch.set(db.collection("oauth_client_ids").doc(CLIENT_ID), {
      appId,
      clientId: CLIENT_ID,
      created_at: now,
    });
    batch.set(db.collection("user_apps").doc(appId), {
      id: appId,
      name: "OAuth Test Client",
      description: "Localhost test client for OpenID Connect and OAuth 2.0 flow testing.",
      website: "http://localhost:3001",
      author_id: primaryUserDoc.id,
      icon: null,
      created_at: now,
      updated_at: now,
    });
    batch.set(db.collection("oauth_clients").doc(appId), {
      app_id: appId,
      client_id: CLIENT_ID,
      client_type: "confidential",
      token_endpoint_auth_method: "client_secret_post",
      client_secret_hash: secretHash,
      pkce_required: true,
      is_first_party: false,
      enabled: true,
      redirect_uris: JSON.stringify(redirectUris),
      scopes: JSON.stringify(scopes),
    });

    await batch.commit();
    console.log("✅ Successfully created OAuth Test Client!");
  }

  console.log(`\n📋 Client Details:`);
  console.log(`   Client ID:     ${CLIENT_ID}`);
  console.log(`   Client Secret: ${CLIENT_SECRET}`);
  console.log(`   Redirect URI:  ${REDIRECT_URI}`);
  console.log(`   Auth Method:   client_secret_post + PKCE`);

  process.exit(0);
}

seedTestApp().catch((err) => {
  console.error("❌ Seed test client failed:", err);
  process.exit(1);
});
