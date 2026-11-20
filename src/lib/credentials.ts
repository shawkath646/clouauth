import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase";
import { generateId } from "@/utils/utils";
import { toDate, toNullableDate } from "@/utils/date-time";
import type {
  DBPasswordCredential,
  DBPasswordHistory,
  DBRecoveryCode,
  DBTotpCredential,
  DBPasskeyCredential,
  DBOAuthAccount,
} from "@/types/auth.types";

// Password Credentials
export async function getPasswordCredential(userId: string): Promise<DBPasswordCredential | null> {
  const doc = await db.collection("users").doc(userId).collection("security").doc("password").get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return {
    user_id: userId,
    password_hash: d.password_hash,
    last_changed_on: toDate(d.last_changed_on),
    force_change: d.force_change ?? false,
    failed_attempts: d.failed_attempts ?? 0,
    locked_until: toNullableDate(d.locked_until),
  };
}

export async function setPasswordCredential(userId: string, passwordHash: string): Promise<void> {
  const now = Timestamp.now();
  await db.collection("users").doc(userId).collection("security").doc("password").set({
    user_id: userId,
    password_hash: passwordHash,
    last_changed_on: now,
    force_change: false,
    failed_attempts: 0,
    locked_until: null,
  });
}

export async function updatePasswordCredential(userId: string, data: Partial<DBPasswordCredential>): Promise<void> {
  const updateData: Record<string, unknown> = { ...data };
  if (data.locked_until !== undefined) {
    updateData.locked_until = data.locked_until ? Timestamp.fromDate(new Date(data.locked_until)) : null;
  }
  if (data.last_changed_on !== undefined) {
    updateData.last_changed_on = Timestamp.fromDate(new Date(data.last_changed_on));
  }
  await db.collection("users").doc(userId).collection("security").doc("password").update(updateData);
}

export async function incrementFailedAttempts(userId: string): Promise<{ failed_attempts: number }> {
  const ref = db.collection("users").doc(userId).collection("security").doc("password");
  await ref.update({ failed_attempts: FieldValue.increment(1) });
  const updated = await ref.get();
  return { failed_attempts: updated.data()?.failed_attempts ?? 1 };
}

export async function resetFailedAttempts(userId: string): Promise<void> {
  await db.collection("users").doc(userId).collection("security").doc("password").update({
    failed_attempts: 0,
    locked_until: null,
  });
}

export async function addPasswordHistory(userId: string, passwordHash: string): Promise<void> {
  const id = generateId();
  await db.collection("users").doc(userId).collection("password_history").doc(id).set({
    id,
    user_id: userId,
    password_hash: passwordHash,
    created_on: Timestamp.now(),
  });
}

export async function getPasswordHistory(userId: string, limit = 5): Promise<DBPasswordHistory[]> {
  const snap = await db
    .collection("users")
    .doc(userId)
    .collection("password_history")
    .orderBy("created_on", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((d) => ({
    id: d.id,
    user_id: userId,
    password_hash: d.data().password_hash,
    created_on: toDate(d.data().created_on).toISOString(),
  }));
}

// TOTP Credentials
export async function getTotpMethod(userId: string): Promise<DBTotpCredential | null> {
  const doc = await db.collection("users").doc(userId).collection("security").doc("totp").get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  if (d.enabled === false) return null;
  return {
    two_factor_id: userId,
    secret: d.secret,
    algorithm: d.algorithm ?? "SHA1",
    digits: d.digits ?? 6,
    period: d.period ?? 30,
  };
}

export async function setTotpMethod(
  userId: string,
  data: Omit<DBTotpCredential, "two_factor_id"> & { enabled?: boolean }
): Promise<void> {
  const ref = db.collection("users").doc(userId).collection("security").doc("totp");
  await ref.set({
    two_factor_id: userId,
    enabled: data.enabled ?? true,
    secret: data.secret,
    algorithm: data.algorithm || "SHA1",
    digits: data.digits || 6,
    period: data.period || 30,
    updated_on: Timestamp.now(),
  });

  await db.collection("users").doc(userId).update({
    "two_factor.totp_enabled": data.enabled ?? true,
  });
}

export async function deleteTotpMethod(userId: string): Promise<void> {
  await db.collection("users").doc(userId).collection("security").doc("totp").delete();
  await db.collection("users").doc(userId).update({
    "two_factor.totp_enabled": false,
  });
}

// Passkeys
export async function getUserPasskeys(userId: string): Promise<DBPasskeyCredential[]> {
  const snap = await db.collection("users").doc(userId).collection("passkeys").get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      two_factor_id: userId,
      credential_id: data.credential_id,
      public_key: data.public_key,
      sign_count: data.sign_count ?? 0,
      device_name: data.device_name ?? undefined,
      rp_id: data.rp_id ?? null,
      created_on: toDate(data.created_on).toISOString(),
      last_used_on: data.last_used_on ? toDate(data.last_used_on).toISOString() : undefined,
    };
  });
}
export const getPasskeys = getUserPasskeys;

export async function findPasskeyByCredentialId(credentialId: string): Promise<{ passkey: DBPasskeyCredential; userId: string } | null> {
  const indexDoc = await db.collection("passkey_credentials").doc(credentialId).get();
  if (!indexDoc.exists) return null;
  const { userId, passkeyId } = indexDoc.data() as { userId: string; passkeyId: string };
  const doc = await db.collection("users").doc(userId).collection("passkeys").doc(passkeyId).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return {
    userId,
    passkey: {
      id: doc.id,
      two_factor_id: userId,
      credential_id: d.credential_id,
      public_key: d.public_key,
      sign_count: d.sign_count ?? 0,
      device_name: d.device_name ?? undefined,
      created_on: toDate(d.created_on).toISOString(),
      last_used_on: d.last_used_on ? toDate(d.last_used_on).toISOString() : undefined,
    },
  };
}

export async function addPasskey(userId: string, data: {
  credential_id: string;
  public_key: string;
  sign_count: number;
  device_name?: string | null;
  rp_id?: string | null;
}): Promise<DBPasskeyCredential> {
  const passkeyId = generateId();
  const now = Timestamp.now();
  const docData = {
    id: passkeyId,
    two_factor_id: userId,
    credential_id: data.credential_id,
    public_key: data.public_key,
    sign_count: data.sign_count,
    device_name: data.device_name || null,
    rp_id: data.rp_id || null,
    created_on: now,
    last_used_on: null,
  };

  const batch = db.batch();
  batch.set(db.collection("users").doc(userId).collection("passkeys").doc(passkeyId), docData);
  batch.set(db.collection("passkey_credentials").doc(data.credential_id), { userId, passkeyId });
  await batch.commit();

  return {
    id: passkeyId,
    two_factor_id: userId,
    credential_id: data.credential_id,
    public_key: data.public_key,
    sign_count: data.sign_count,
    device_name: data.device_name ?? undefined,
    created_on: now.toDate().toISOString(),
    last_used_on: undefined,
  };
}

export async function updatePasskey(userId: string, passkeyId: string, data: { sign_count?: number; last_used_on?: Date; device_name?: string }): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (data.sign_count !== undefined) updateData.sign_count = data.sign_count;
  if (data.last_used_on) updateData.last_used_on = Timestamp.fromDate(data.last_used_on);
  if (data.device_name !== undefined) updateData.device_name = data.device_name;
  await db.collection("users").doc(userId).collection("passkeys").doc(passkeyId).update(updateData);
}

export async function deletePasskey(userId: string, passkeyId: string): Promise<void> {
  const passkeyRef = db.collection("users").doc(userId).collection("passkeys").doc(passkeyId);
  const doc = await passkeyRef.get();
  if (!doc.exists) return;
  const credId = doc.data()?.credential_id;

  const batch = db.batch();
  batch.delete(passkeyRef);
  if (credId) {
    batch.delete(db.collection("passkey_credentials").doc(credId));
  }
  await batch.commit();
}

// Recovery Codes
export async function getRecoveryCodes(userId: string): Promise<DBRecoveryCode[]> {
  const snap = await db.collection("users").doc(userId).collection("recovery_codes").get();
  return snap.docs.map((d) => ({
    id: d.id,
    user_id: userId,
    code_hash: d.data().code_hash,
    used: d.data().used ?? false,
    created_on: toDate(d.data().created_on).toISOString(),
    used_on: d.data().used_on ? toDate(d.data().used_on).toISOString() : undefined,
  }));
}

export async function replaceRecoveryCodes(userId: string, codeHashes: string[]): Promise<void> {
  const codesRef = db.collection("users").doc(userId).collection("recovery_codes");
  const existing = await codesRef.get();
  const batch = db.batch();

  existing.docs.forEach((doc) => batch.delete(doc.ref));

  const now = Timestamp.now();
  for (const hash of codeHashes) {
    const codeId = generateId();
    batch.set(codesRef.doc(codeId), {
      id: codeId,
      user_id: userId,
      code_hash: hash,
      used: false,
      created_on: now,
      used_on: null,
    });
  }
  await batch.commit();
}

export async function markRecoveryCodeUsed(userId: string, codeId: string): Promise<void> {
  await db.collection("users").doc(userId).collection("recovery_codes").doc(codeId).update({
    used: true,
    used_on: Timestamp.now(),
  });
}

// Two-Factor Aggregate
export async function getTwoFactorStatus(userId: string): Promise<{
  email_id?: string | null;
  phone_id?: string | null;
  totp_enabled?: boolean;
  passkeys?: DBPasskeyCredential[];
}> {
  const userDoc = await db.collection("users").doc(userId).get();
  const twoFactor = userDoc.data()?.two_factor || {};
  const [passkeys, totp] = await Promise.all([
    getUserPasskeys(userId),
    getTotpMethod(userId),
  ]);

  return {
    email_id: twoFactor.email_id || null,
    phone_id: twoFactor.phone_id || null,
    totp_enabled: Boolean(totp),
    passkeys,
  };
}
export const getTwoFactor = getTwoFactorStatus;

export async function updateTwoFactorSettings(userId: string, data: { email_id?: string | null; phone_id?: string | null }): Promise<void> {
  await db.collection("users").doc(userId).update({
    "two_factor.email_id": data.email_id ?? null,
    "two_factor.phone_id": data.phone_id ?? null,
  });
}

// Linked OAuth Accounts
export async function getLinkedOAuthAccounts(userId: string): Promise<DBOAuthAccount[]> {
  const snap = await db.collection("users").doc(userId).collection("oauth_accounts").get();
  return snap.docs.map((d) => ({
    id: d.id,
    user_id: userId,
    provider: d.data().provider,
    provider_user_id: d.data().provider_user_id,
    access_token: d.data().access_token ?? undefined,
    refresh_token: d.data().refresh_token ?? undefined,
    expires_at: d.data().expires_at ?? null,
    created_on: toDate(d.data().created_on),
  }));
}
export const getOAuthAccounts = getLinkedOAuthAccounts;

export async function findLinkedOAuthAccount(provider: string, providerUserId: string): Promise<{ account: DBOAuthAccount; userId: string } | null> {
  const key = `${provider.toLowerCase().trim()}_${providerUserId}`;
  const indexDoc = await db.collection("oauth_account_index").doc(key).get();
  if (!indexDoc.exists) return null;

  const { userId, accountId } = indexDoc.data() as { userId: string; accountId: string };
  const doc = await db.collection("users").doc(userId).collection("oauth_accounts").doc(accountId).get();
  if (!doc.exists) return null;
  const d = doc.data()!;

  return {
    userId,
    account: {
      id: doc.id,
      user_id: userId,
      provider: d.provider,
      provider_user_id: d.provider_user_id,
      access_token: d.access_token ?? undefined,
      refresh_token: d.refresh_token ?? undefined,
      expires_at: d.expires_at ?? null,
      created_on: toDate(d.created_on),
    },
  };
}

export async function upsertLinkedOAuthAccount(userId: string, data: {
  provider: string;
  provider_user_id: string;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
}): Promise<DBOAuthAccount> {
  const key = `${data.provider.toLowerCase().trim()}_${data.provider_user_id}`;
  const indexRef = db.collection("oauth_account_index").doc(key);
  const existingIndex = await indexRef.get();

  const now = Timestamp.now();
  const accountId = existingIndex.exists ? existingIndex.data()?.accountId : generateId();
  const accountRef = db.collection("users").doc(userId).collection("oauth_accounts").doc(accountId);

  const payload = {
    id: accountId,
    user_id: userId,
    provider: data.provider,
    provider_user_id: data.provider_user_id,
    access_token: data.access_token || null,
    refresh_token: data.refresh_token || null,
    expires_at: data.expires_at || null,
    updated_on: now,
  };

  const batch = db.batch();
  if (!existingIndex.exists) {
    (payload as Record<string, unknown>).created_on = now;
    batch.set(indexRef, { userId, accountId, provider: data.provider, providerUserId: data.provider_user_id });
    batch.set(accountRef, payload);
  } else {
    batch.update(accountRef, payload);
  }
  await batch.commit();

  return {
    id: accountId,
    user_id: userId,
    provider: data.provider,
    provider_user_id: data.provider_user_id,
    access_token: data.access_token ?? undefined,
    refresh_token: data.refresh_token ?? undefined,
    expires_at: data.expires_at ?? null,
    created_on: now.toDate(),
  };
}
export const upsertOAuthAccount = upsertLinkedOAuthAccount;
export const findOAuthAccount = findLinkedOAuthAccount;

export async function updateLinkedOAuthAccountTokens(accountId: string, data: {
  access_token: string;
  refresh_token?: string;
  expires_at?: number | null;
}): Promise<void> {
  const snap = await db.collectionGroup("oauth_accounts").where("id", "==", accountId).limit(1).get();
  if (snap.empty) return;
  const docRef = snap.docs[0].ref;
  const updateData: Record<string, unknown> = {
    access_token: data.access_token,
    updated_on: Timestamp.now(),
  };
  if (data.refresh_token !== undefined) updateData.refresh_token = data.refresh_token;
  if (data.expires_at !== undefined) updateData.expires_at = data.expires_at;
  await docRef.update(updateData);
}
export const updateOAuthAccountTokens = updateLinkedOAuthAccountTokens;

export async function deleteLinkedOAuthAccountsByProvider(userId: string, provider: string): Promise<void> {
  const snap = await db.collection("users").doc(userId).collection("oauth_accounts").get();
  const matchingDocs = snap.docs.filter((d) => d.data().provider?.toLowerCase() === provider.toLowerCase());
  if (matchingDocs.length === 0) return;

  const batch = db.batch();
  for (const d of matchingDocs) {
    batch.delete(d.ref);
    const data = d.data();
    const key = `${data.provider.toLowerCase().trim()}_${data.provider_user_id}`;
    batch.delete(db.collection("oauth_account_index").doc(key));
  }
  await batch.commit();
}
export const deleteOAuthAccountsByProvider = deleteLinkedOAuthAccountsByProvider;
