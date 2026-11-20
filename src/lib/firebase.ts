import "server-only";

import {
  initializeApp,
  getApps,
  cert,
} from "firebase-admin/app";

import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getEnv } from "@/utils/env.server";

// Firebase credentials
const serviceAccount = {
  projectId: getEnv("FIREBASE_PROJECT_ID"),
  privateKeyId: getEnv("FIREBASE_PRIVATE_KEY_ID"),
  privateKey: getEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  clientEmail: getEnv("FIREBASE_CLIENT_EMAIL"),
  clientId: getEnv("FIREBASE_CLIENT_ID"),
  authUri: getEnv("FIREBASE_AUTH_URI"),
  tokenUri: getEnv("FIREBASE_TOKEN_URI"),
  authProviderX509CertUrl: getEnv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL"),
  clientX509CertUrl: getEnv("FIREBASE_CLIENT_X509_CERT_URL"),
  universeDomain: getEnv("FIREBASE_UNIVERSE_DOMAIN"),
};


export const app =
  getApps().length > 0
    ? getApps()[0]!
    : initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
      storageBucket: getEnv("FIREBASE_STORAGE_BUCKET"),
    });

// Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const bucket = storage.bucket();
