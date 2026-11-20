import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { db } from "@/lib/firebase";
import { generateId } from "@/utils/utils";
import { toDate, toNullableDate } from "@/utils/date-time";

export interface DBUserApp {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  website: string | null;
  author_id: string;
  created_at: Date;
  updated_at: Date;
  oauth?: DBOAuthClientConfig | null;
}

export interface DBOAuthClientConfig {
  app_id: string;
  enabled: boolean;
  is_first_party: boolean;
  client_id: string;
  client_secret_hash: string | null;
  client_type: string;
  redirect_uris: string;
  scopes: string;
  pkce_required: boolean;
  token_endpoint_auth_method: string;
}

export interface DBOAuthConsent {
  id: string;
  user_id: string;
  client_id: string;
  scopes: string;
  created_at: Date;
  updated_at: Date;
  revoked_at: Date | null;
  client?: DBOAuthClientConfig & { app?: DBUserApp };
}

function mapAppDoc(id: string, d: Record<string, unknown>): DBUserApp {
  return {
    id,
    author_id: d.author_id as string,
    name: d.name as string,
    description: (d.description as string) ?? null,
    icon: (d.icon as string) ?? null,
    website: (d.website as string) ?? null,
    created_at: toDate(d.created_at),
    updated_at: toDate(d.updated_at),
  };
}

export async function getUserApps(authorId: string): Promise<DBUserApp[]> {
  const snap = await db.collection("user_apps").where("author_id", "==", authorId).get();
  const apps: DBUserApp[] = [];

  for (const doc of snap.docs) {
    const app = mapAppDoc(doc.id, doc.data());
    const clientDoc = await db.collection("oauth_clients").doc(app.id).get();
    if (clientDoc.exists) {
      app.oauth = clientDoc.data() as DBOAuthClientConfig;
    }
    apps.push(app);
  }

  return apps;
}

export async function getAppById(appId: string): Promise<DBUserApp | null> {
  const doc = await db.collection("user_apps").doc(appId).get();
  if (!doc.exists) return null;
  const app = mapAppDoc(doc.id, doc.data()!);
  const clientDoc = await db.collection("oauth_clients").doc(appId).get();
  if (clientDoc.exists) {
    app.oauth = clientDoc.data() as DBOAuthClientConfig;
  }
  return app;
}

export async function findClientByAppId(appId: string): Promise<DBOAuthClientConfig | null> {
  const doc = await db.collection("oauth_clients").doc(appId).get();
  if (!doc.exists) return null;
  return doc.data() as DBOAuthClientConfig;
}

export async function createApp(
  authorId: string,
  appData: {
    name: string;
    description?: string | null;
    icon?: string | null;
    website?: string | null;
  },
  clientData: {
    client_id: string;
    client_secret_hash?: string | null;
    client_type?: string;
    redirect_uris: string;
    scopes: string;
    pkce_required?: boolean;
    token_endpoint_auth_method?: string;
    is_first_party?: boolean;
  }
): Promise<{ app: DBUserApp; oauth: DBOAuthClientConfig }> {
  const appId = generateId();
  const now = Timestamp.now();

  const clientRef = db.collection("oauth_clients").doc(appId);
  const clientIndexRef = db.collection("oauth_client_ids").doc(clientData.client_id);
  const appRef = db.collection("user_apps").doc(appId);

  const appRecord: DBUserApp = {
    id: appId,
    author_id: authorId,
    name: appData.name,
    description: appData.description || null,
    icon: appData.icon || null,
    website: appData.website || null,
    created_at: now.toDate(),
    updated_at: now.toDate(),
  };

  const clientRecord: DBOAuthClientConfig = {
    app_id: appId,
    client_id: clientData.client_id,
    client_secret_hash: clientData.client_secret_hash || null,
    client_type: clientData.client_type || "confidential",
    redirect_uris: clientData.redirect_uris,
    scopes: clientData.scopes,
    pkce_required: clientData.pkce_required ?? true,
    token_endpoint_auth_method: clientData.token_endpoint_auth_method || "client_secret_post",
    is_first_party: clientData.is_first_party ?? false,
    enabled: true,
  };

  await db.runTransaction(async (t) => {
    const existing = await t.get(clientIndexRef);
    if (existing.exists) {
      const err = new Error("Client ID already in use.");
      (err as { code?: string }).code = "P2002";
      throw err;
    }

    t.set(clientIndexRef, { appId, clientId: clientData.client_id, created_at: now });
    t.set(appRef, {
      ...appRecord,
      created_at: now,
      updated_at: now,
    });
    t.set(clientRef, clientRecord);
  });

  return { app: appRecord, oauth: clientRecord };
}

export async function updateApp(
  appId: string,
  appData: Partial<DBUserApp>,
  clientData?: Partial<DBOAuthClientConfig>
): Promise<void> {
  const clientDoc = await db.collection("oauth_clients").doc(appId).get();
  const clientId = clientDoc.data()?.client_id;

  const now = Timestamp.now();
  const batch = db.batch();

  batch.update(db.collection("user_apps").doc(appId), {
    ...appData,
    updated_at: now,
  });

  if (clientData) {
    batch.update(db.collection("oauth_clients").doc(appId), {
      ...clientData,
    });
  }

  await batch.commit();

  if (clientId) {
    revalidateTag(`oauth-client:${clientId}`, "default");
    revalidateTag("oauth-clients", "default");
  }
}

export async function deleteApp(appId: string): Promise<void> {
  const clientDoc = await db.collection("oauth_clients").doc(appId).get();
  const clientId = clientDoc.data()?.client_id;

  const batch = db.batch();
  batch.delete(db.collection("user_apps").doc(appId));
  batch.delete(db.collection("oauth_clients").doc(appId));
  if (clientId) {
    batch.delete(db.collection("oauth_client_ids").doc(clientId));
  }
  await batch.commit();

  if (clientId) {
    revalidateTag(`oauth-client:${clientId}`, "default");
    revalidateTag("oauth-clients", "default");
  }
}

export async function findOAuthClient(clientId: string): Promise<(DBOAuthClientConfig & { app?: DBUserApp }) | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("oauth-clients", `oauth-client:${clientId}`);

  const indexDoc = await db.collection("oauth_client_ids").doc(clientId).get();
  if (!indexDoc.exists) return null;
  const appId = indexDoc.data()?.appId;
  if (!appId) return null;

  const [clientDoc, appDoc] = await Promise.all([
    db.collection("oauth_clients").doc(appId).get(),
    db.collection("user_apps").doc(appId).get(),
  ]);

  if (!clientDoc.exists) return null;
  const clientConfig = clientDoc.data() as DBOAuthClientConfig;

  let app: DBUserApp | undefined;
  if (appDoc.exists) {
    const d = appDoc.data()!;
    app = {
      id: appDoc.id,
      author_id: d.author_id,
      name: d.name,
      description: d.description ?? null,
      icon: d.icon ?? null,
      website: d.website ?? null,
      created_at: toDate(d.created_at),
      updated_at: toDate(d.updated_at),
    };
  }

  return { ...clientConfig, app };
}

export const findClientByClientId = findOAuthClient;

export async function getOAuthConsent(userId: string, clientId: string): Promise<DBOAuthConsent | null> {
  const docId = `${userId}_${clientId}`;
  const doc = await db.collection("oauth_consents").doc(docId).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return {
    id: doc.id,
    user_id: d.user_id,
    client_id: d.client_id,
    scopes: d.scopes,
    created_at: toDate(d.created_at),
    updated_at: toDate(d.updated_at),
    revoked_at: toNullableDate(d.revoked_at),
  };
}
export const getConsent = getOAuthConsent;

export async function upsertOAuthConsent(userId: string, clientId: string, scopes: string): Promise<DBOAuthConsent> {
  const docId = `${userId}_${clientId}`;
  const now = Timestamp.now();
  const ref = db.collection("oauth_consents").doc(docId);
  const existing = await ref.get();

  if (existing.exists) {
    await ref.update({
      scopes,
      revoked_at: null,
      updated_at: now,
    });
  } else {
    await ref.set({
      id: docId,
      user_id: userId,
      client_id: clientId,
      scopes,
      created_at: now,
      updated_at: now,
      revoked_at: null,
    });
  }

  return {
    id: docId,
    user_id: userId,
    client_id: clientId,
    scopes,
    created_at: existing.exists ? toDate(existing.data()?.created_at) : now.toDate(),
    updated_at: now.toDate(),
    revoked_at: null,
  };
}
export const upsertConsent = upsertOAuthConsent;

export async function revokeOAuthConsent(userId: string, clientId: string): Promise<void> {
  const docId = `${userId}_${clientId}`;
  await db.collection("oauth_consents").doc(docId).update({
    revoked_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  });
}
export const revokeConsent = revokeOAuthConsent;

export async function getUserOAuthConsents(userId: string): Promise<DBOAuthConsent[]> {
  const snap = await db.collection("oauth_consents").where("user_id", "==", userId).get();
  const consents: DBOAuthConsent[] = [];

  for (const d of snap.docs) {
    const data = d.data();
    const client = await findOAuthClient(data.client_id);
    consents.push({
      id: d.id,
      user_id: data.user_id,
      client_id: data.client_id,
      scopes: data.scopes,
      created_at: toDate(data.created_at),
      updated_at: toDate(data.updated_at),
      revoked_at: toNullableDate(data.revoked_at),
      client: client || undefined,
    });
  }

  return consents;
}
export const getUserConsents = getUserOAuthConsents;
