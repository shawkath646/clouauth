import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase";
import { generateId } from "@/utils/utils";
import { toDate, toNullableDate } from "@/utils/date-time";
import type {
  DBUser,
  DBUserEmail,
  DBUserPhone,
  DBAddress,
} from "@/types/user.types";
import type {
  DBUserPreference,
  DBNotificationPreference,
} from "@/types/preferences.types";

export async function getUser(userId: string): Promise<DBUser | null> {
  if (!userId) return null;
  try {
    const doc = await db.collection("users").doc(userId).get();
    if (!doc.exists) return null;
    const d = doc.data()!;
    return {
      id: doc.id,
      username: d.username,
      first_name: d.first_name,
      last_name: d.last_name,
      avatar: d.avatar,
      bio: d.bio ?? null,
      date_of_birth: d.date_of_birth ?? null,
      pronouns: d.pronouns ?? null,
      username_last_changed: toNullableDate(d.username_last_changed),
      account_status: d.account_status
        ? {
            is_active: Boolean(d.account_status.is_active),
            self_enable: Boolean(d.account_status.self_enable),
            reason: d.account_status.reason ?? null,
          }
        : { is_active: true, self_enable: false, reason: null },
      created_on: toDate(d.created_on),
      updated_on: toDate(d.updated_on),
    };
  } catch (error) {
    console.error("[Users] Error querying user:", error instanceof Error ? error.message : error);
    return null;
  }
}

export const findUserById = getUser;
export const getUserById = getUser;

export async function getUserByUsername(username: string): Promise<DBUser | null> {
  if (!username) return null;
  const usernameDoc = await db.collection("usernames").doc(username.toLowerCase().trim()).get();
  if (!usernameDoc.exists) return null;
  const userId = usernameDoc.data()?.userId;
  if (!userId) return null;
  return getUser(userId);
}

export const findUserByUsername = getUserByUsername;

export async function getUserByEmail(email: string): Promise<DBUser | null> {
  if (!email) return null;
  const emailDoc = await db.collection("user_emails").doc(email.toLowerCase().trim()).get();
  if (!emailDoc.exists) return null;
  const userId = emailDoc.data()?.userId;
  if (!userId) return null;
  return getUser(userId);
}

export const findUserByEmail = getUserByEmail;

export async function findEmailRecord(address: string): Promise<DBUserEmail | null> {
  const norm = address.toLowerCase().trim();
  const indexDoc = await db.collection("user_emails").doc(norm).get();
  if (!indexDoc.exists) return null;
  const { userId, emailId } = indexDoc.data() as { userId: string; emailId: string };
  const doc = await db.collection("users").doc(userId).collection("emails").doc(emailId).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return {
    id: doc.id,
    user_id: userId,
    address: d.address,
    verified: d.verified ?? false,
    is_primary: d.is_primary ?? false,
    added_on: toDate(d.added_on),
    verified_on: toNullableDate(d.verified_on),
  };
}
export const findEmailByAddress = findEmailRecord;

export async function createUserWithAccount(data: {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar: string;
  password_hash?: string | null;
  bio?: string | null;
  date_of_birth?: string | null;
  pronouns?: string | null;
}): Promise<DBUser> {
  const userId = generateId();
  const emailId = generateId();
  const normalizedEmail = data.email.toLowerCase().trim();
  const normalizedUsername = data.username.toLowerCase().trim();
  const now = Timestamp.now();

  const usernameRef = db.collection("usernames").doc(normalizedUsername);
  const emailRef = db.collection("user_emails").doc(normalizedEmail);
  const userRef = db.collection("users").doc(userId);
  const userEmailRef = userRef.collection("emails").doc(emailId);
  const passwordRef = userRef.collection("security").doc("password");

  await db.runTransaction(async (t) => {
    const [uDoc, eDoc] = await Promise.all([t.get(usernameRef), t.get(emailRef)]);
    if (uDoc.exists) {
      throw new Error("Username already taken.");
    }
    if (eDoc.exists) {
      throw new Error("Email address already in use.");
    }

    t.set(usernameRef, { userId, username: data.username, created_at: now });
    t.set(emailRef, { userId, emailId, address: normalizedEmail, is_primary: true, verified: false, created_at: now });

    t.set(userRef, {
      id: userId,
      username: data.username,
      first_name: data.first_name,
      last_name: data.last_name,
      avatar: data.avatar,
      bio: data.bio || null,
      date_of_birth: data.date_of_birth || null,
      pronouns: data.pronouns || null,
      username_last_changed: null,
      account_status: { is_active: true, self_enable: false, reason: null, updated_on: now },
      preferences: { user_id: userId, theme: "system", language: "en", timezone: "UTC", profile_visibility: "public" },
      notifications: { user_id: userId, email_security: true, email_marketing: false, login_alerts: true, product_updates: true },
      created_on: now,
      updated_on: now,
    });

    t.set(userEmailRef, {
      id: emailId,
      user_id: userId,
      address: normalizedEmail,
      is_primary: true,
      verified: false,
      added_on: now,
      verified_on: null,
    });

    if (data.password_hash) {
      t.set(passwordRef, {
        user_id: userId,
        password_hash: data.password_hash,
        last_changed_on: now,
        force_change: false,
        failed_attempts: 0,
        locked_until: null,
      });
    }
  });

  return {
    id: userId,
    username: data.username,
    first_name: data.first_name,
    last_name: data.last_name,
    avatar: data.avatar,
    bio: data.bio || null,
    date_of_birth: data.date_of_birth || null,
    pronouns: data.pronouns || null,
    username_last_changed: null,
    account_status: { is_active: true, self_enable: false, reason: null },
    created_on: now.toDate(),
    updated_on: now.toDate(),
  };
}
export const createUser = createUserWithAccount;

export async function updateUser(userId: string, data: Partial<DBUser>): Promise<void> {
  const updatePayload: Record<string, unknown> = {
    ...data,
    updated_on: Timestamp.now(),
  };
  if (data.username_last_changed) {
    updatePayload.username_last_changed = Timestamp.fromDate(new Date(data.username_last_changed));
  }
  await db.collection("users").doc(userId).update(updatePayload);
}

export async function updateUsername(userId: string, oldUsername: string, newUsername: string): Promise<void> {
  const oldNorm = oldUsername.toLowerCase().trim();
  const newNorm = newUsername.toLowerCase().trim();
  const now = Timestamp.now();

  const oldRef = db.collection("usernames").doc(oldNorm);
  const newRef = db.collection("usernames").doc(newNorm);
  const userRef = db.collection("users").doc(userId);

  await db.runTransaction(async (t) => {
    const newDoc = await t.get(newRef);
    if (newDoc.exists && newDoc.data()?.userId !== userId) {
      throw new Error("Username already taken.");
    }

    t.delete(oldRef);
    t.set(newRef, { userId, username: newUsername, created_at: now });
    t.update(userRef, {
      username: newUsername,
      username_last_changed: now,
      updated_on: now,
    });
  });
}

export async function updateUserAccountStatus(
  userId: string,
  status: { is_active: boolean; self_enable: boolean; reason: string | null }
): Promise<void> {
  await db.collection("users").doc(userId).update({
    account_status: { ...status, updated_on: Timestamp.now() },
    updated_on: Timestamp.now(),
  });
}
export const updateAccountStatus = updateUserAccountStatus;

// Subcollections: Emails
export async function getUserEmails(userId: string): Promise<DBUserEmail[]> {
  const snap = await db.collection("users").doc(userId).collection("emails").get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      user_id: userId,
      address: data.address,
      verified: data.verified ?? false,
      is_primary: data.is_primary ?? false,
      added_on: toDate(data.added_on),
      verified_on: toNullableDate(data.verified_on),
    };
  });
}

export async function addUserEmail(userId: string, address: string, isPrimary = false): Promise<DBUserEmail> {
  const norm = address.toLowerCase().trim();
  const emailId = generateId();
  const now = Timestamp.now();

  const emailIndexRef = db.collection("user_emails").doc(norm);
  const userEmailRef = db.collection("users").doc(userId).collection("emails").doc(emailId);

  await db.runTransaction(async (t) => {
    const existing = await t.get(emailIndexRef);
    if (existing.exists) {
      throw new Error("Email address already in use.");
    }

    t.set(emailIndexRef, { userId, emailId, address: norm, is_primary: isPrimary, verified: false, created_at: now });
    t.set(userEmailRef, {
      id: emailId,
      user_id: userId,
      address: norm,
      verified: false,
      is_primary: isPrimary,
      added_on: now,
      verified_on: null,
    });
  });

  return {
    id: emailId,
    user_id: userId,
    address: norm,
    verified: false,
    is_primary: isPrimary,
    added_on: now.toDate(),
    verified_on: null,
  };
}

export async function deleteUserEmail(userId: string, emailId: string): Promise<void> {
  const emailRef = db.collection("users").doc(userId).collection("emails").doc(emailId);
  const doc = await emailRef.get();
  if (!doc.exists) return;

  const data = doc.data()!;
  const indexRef = db.collection("user_emails").doc(data.address.toLowerCase().trim());

  const batch = db.batch();
  batch.delete(emailRef);
  batch.delete(indexRef);
  await batch.commit();
}

export async function verifyUserEmail(userId: string, emailId: string): Promise<void> {
  const now = Timestamp.now();
  const emailRef = db.collection("users").doc(userId).collection("emails").doc(emailId);
  const doc = await emailRef.get();
  if (!doc.exists) return;

  const data = doc.data()!;
  const indexRef = db.collection("user_emails").doc(data.address.toLowerCase().trim());

  const batch = db.batch();
  batch.update(emailRef, { verified: true, verified_on: now });
  batch.update(indexRef, { verified: true });
  await batch.commit();
}
export const addEmail = addUserEmail;
export const deleteEmail = deleteUserEmail;
export const verifyEmail = verifyUserEmail;
export const getEmails = getUserEmails;

export async function setUserPrimaryEmail(userId: string, emailId: string): Promise<void> {
  const emails = await getUserEmails(userId);
  const batch = db.batch();

  for (const email of emails) {
    const ref = db.collection("users").doc(userId).collection("emails").doc(email.id);
    const isTarget = email.id === emailId;
    batch.update(ref, { is_primary: isTarget });

    const indexRef = db.collection("user_emails").doc(email.address.toLowerCase().trim());
    batch.update(indexRef, { is_primary: isTarget });
  }

  await batch.commit();
}

// Subcollections: Phones
export async function getUserPhones(userId: string): Promise<DBUserPhone[]> {
  const snap = await db.collection("users").doc(userId).collection("phones").get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      user_id: userId,
      country_code: data.country_code,
      number: data.number,
      verified: data.verified ?? false,
      is_primary: data.is_primary ?? false,
      added_on: toDate(data.added_on),
      verified_on: toNullableDate(data.verified_on),
    };
  });
}

export async function addUserPhone(userId: string, data: { country_code: string; number: string; is_primary?: boolean }): Promise<DBUserPhone> {
  const phoneId = generateId();
  const now = Timestamp.now();
  const phoneData = {
    id: phoneId,
    user_id: userId,
    country_code: data.country_code,
    number: data.number,
    verified: false,
    is_primary: data.is_primary ?? false,
    added_on: now,
    verified_on: null,
  };

  await db.collection("users").doc(userId).collection("phones").doc(phoneId).set(phoneData);
  return {
    ...phoneData,
    added_on: now.toDate(),
    verified_on: null,
  };
}

export async function deleteUserPhone(userId: string, phoneId: string): Promise<void> {
  await db.collection("users").doc(userId).collection("phones").doc(phoneId).delete();
}

// Subcollections: Addresses
export async function getUserAddresses(userId: string): Promise<DBAddress[]> {
  const snap = await db.collection("users").doc(userId).collection("addresses").get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      user_id: userId,
      type: data.type,
      address_1: data.address_1,
      address_2: data.address_2 ?? null,
      city: data.city,
      state: data.state ?? null,
      zip_code: data.zip_code,
      country: data.country,
      is_default: data.is_default ?? false,
    };
  });
}

export async function addUserAddress(userId: string, data: Omit<DBAddress, "id" | "user_id">): Promise<DBAddress> {
  const addressId = generateId();
  const docData = { ...data, id: addressId, user_id: userId };
  await db.collection("users").doc(userId).collection("addresses").doc(addressId).set(docData);
  return docData;
}

export async function updateUserAddress(userId: string, addressId: string, data: Partial<DBAddress>): Promise<void> {
  await db.collection("users").doc(userId).collection("addresses").doc(addressId).update(data);
}
export const addAddress = addUserAddress;
export const updateAddress = updateUserAddress;
export const getAddresses = getUserAddresses;

// Preferences & Notifications
export async function getUserPreferences(userId: string): Promise<DBUserPreference> {
  const doc = await db.collection("users").doc(userId).get();
  const prefs = doc.data()?.preferences;
  if (prefs) return prefs;
  return {
    user_id: userId,
    theme: "system",
    language: "en",
    timezone: "UTC",
    profile_visibility: "public",
  };
}
export const getPreferences = getUserPreferences;

export async function updateUserPreferences(userId: string, prefs: Partial<DBUserPreference>): Promise<void> {
  await db.collection("users").doc(userId).update({
    preferences: prefs,
    updated_on: Timestamp.now(),
  });
}
export const updatePreferences = updateUserPreferences;

export async function getUserNotifications(userId: string): Promise<DBNotificationPreference> {
  const doc = await db.collection("users").doc(userId).get();
  const notifs = doc.data()?.notifications;
  if (notifs) return notifs;
  return {
    user_id: userId,
    email_security: true,
    email_marketing: false,
    login_alerts: true,
    product_updates: true,
  };
}

export async function updateUserNotifications(userId: string, notifs: Partial<DBNotificationPreference>): Promise<void> {
  await db.collection("users").doc(userId).update({
    notifications: notifs,
    updated_on: Timestamp.now(),
  });
}
