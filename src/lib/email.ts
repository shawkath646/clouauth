import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase";
import { getUser, getUserEmails } from "@/lib/users";
import { handleError } from "@/utils/error";
import { generateId } from "@/utils/utils";
import { getEnv } from "@/utils/env.server";
import { toDate } from "@/utils/date-time";

export interface TemplateDataMap {
  welcome: { name: string };
  verification_code: { code: string };
  account_recovery: { resetLink: string };
  password_changed: { name: string };
  account_deleted: { name: string };
  login_alert: { browser?: string; ip?: string; device?: string; time?: string };
  custom: Record<string, unknown>;
}

export type TemplateId = keyof TemplateDataMap;

export const EMAIL_SUBJECTS: Record<TemplateId, string> = {
  welcome: "Welcome to ClouburstLab!",
  verification_code: "Your Verification Code",
  account_recovery: "Account Recovery",
  password_changed: "Your Password Was Changed",
  account_deleted: "Account Deleted",
  login_alert: "New Sign-In Detected on Your Account",
  custom: "Notification from ClouburstLab",
};

const NON_RETRYABLE_TEMPLATES: Set<TemplateId> = new Set([
  "verification_code",
  "account_recovery",
]);

export interface EmailPayload<T extends TemplateId> {
  to?: string;
  userId: string;
  data: TemplateDataMap[T];
  subject?: string;
}

export interface EmailProviderRequest<T extends TemplateId = TemplateId> {
  to: string;
  userId: string;
  subject: string;
  templateId: T;
  data: TemplateDataMap[T] | Record<string, unknown>;
}

export interface EmailDeliveryResult {
  delivered: boolean;
  messageId?: string;
  reason?: string;
}

export interface EmailProvider {
  name: string;
  send<T extends TemplateId>(
    request: EmailProviderRequest<T>
  ): Promise<EmailDeliveryResult>;
}

class ResendEmailProvider implements EmailProvider {
  name = "resend";

  async send<T extends TemplateId>(
    request: EmailProviderRequest<T>
  ): Promise<EmailDeliveryResult> {
    const apiKey = getEnv("RESEND_API_KEY", true);
    if (!apiKey) {
      return {
        delivered: false,
        reason: "RESEND_API_KEY is not configured",
      };
    }

    const fromAddress =
      getEnv("EMAIL_FROM_ADDRESS", true) ||
      "noreply@auth.clouburstlab.com";

    const html = renderPlaceholderHtml(request.templateId, request.data);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [request.to],
        subject: request.subject,
        html,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return {
        delivered: false,
        reason: `Resend HTTP ${response.status}: ${errBody}`,
      };
    }

    const data = (await response.json()) as { id?: string };
    return {
      delivered: true,
      messageId: data.id,
    };
  }
}

class ConsoleEmailProvider implements EmailProvider {
  name = "console";

  async send<T extends TemplateId>(
    request: EmailProviderRequest<T>
  ): Promise<EmailDeliveryResult> {
    const isDev = getEnv("NODE_ENV", true) !== "production";
    if (isDev) {
      console.log(`\n========================================`);
      console.log(`[EmailProvider: Console] To: ${request.to}`);
      console.log(`Subject: ${request.subject}`);
      console.log(`Template: ${request.templateId}`);
      console.log(`Data:`, JSON.stringify(request.data, null, 2));
      console.log(`========================================\n`);
    }
    return {
      delivered: true,
      messageId: `console_${Date.now()}`,
    };
  }
}

function resolveEmailProvider(): EmailProvider {
  if (getEnv("RESEND_API_KEY", true)) {
    return new ResendEmailProvider();
  }
  return new ConsoleEmailProvider();
}

function renderPlaceholderHtml(
  templateId: TemplateId,
  data: Record<string, unknown>
): string {
  const brandName = "ClouburstLab";
  const json = JSON.stringify(data, null, 2);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${EMAIL_SUBJECTS[templateId]}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e4e4e7; }
          .title { font-size: 20px; font-weight: 600; color: #18181b; margin-top: 0; }
          .pre { background: #f4f4f5; border-radius: 8px; padding: 16px; font-size: 13px; color: #27272a; overflow-x: auto; }
          .footer { margin-top: 32px; font-size: 12px; color: #71717a; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="title">${EMAIL_SUBJECTS[templateId]}</h1>
          <p>This is an automated notification from ${brandName}.</p>
          <pre class="pre">${json}</pre>
          <div class="footer">
            &copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendEmail<T extends TemplateId>(
  templateId: T,
  payload: EmailPayload<T>
): Promise<boolean> {
  let recipientEmail = payload.to;

  if (!recipientEmail && payload.userId) {
    const emails = await getUserEmails(payload.userId);
    recipientEmail = emails.find((e) => e.is_primary)?.address || emails[0]?.address;
  }

  if (!recipientEmail) {
    console.error(`[Email] Failed to resolve recipient for user ${payload.userId}`);
    return false;
  }

  const subject =
    payload.subject ||
    EMAIL_SUBJECTS[templateId] ||
    "Notification from ClouburstLab";

  try {
    const provider = resolveEmailProvider();
    const result = await provider.send({
      to: recipientEmail,
      userId: payload.userId,
      subject,
      templateId,
      data: payload.data,
    });

    if (result.delivered) {
      return true;
    }

    if (!NON_RETRYABLE_TEMPLATES.has(templateId)) {
      await saveFailedEmailToDb({
        userId: payload.userId,
        to: recipientEmail,
        subject,
        templateId,
        data: payload.data,
      });
    }

    return false;
  } catch (err) {
    console.error(`[Email] Exception while sending email:`, err);

    if (!NON_RETRYABLE_TEMPLATES.has(templateId)) {
      await saveFailedEmailToDb({
        userId: payload.userId,
        to: recipientEmail,
        subject,
        templateId,
        data: payload.data,
      }).catch(() => {});
    }

    return false;
  }
}

interface SaveQueuePayload {
  userId: string;
  to: string;
  subject: string;
  templateId: string;
  data: Record<string, unknown>;
}

export async function enqueueEmail<T extends TemplateId>(
  templateId: T,
  payload: {
    userId: string;
    to?: string;
    subject?: string;
    data: TemplateDataMap[T] | Record<string, unknown>;
    nextRetryAt?: Date;
  }
) {
  let recipientEmail = payload.to;

  if (!recipientEmail && payload.userId) {
    const emails = await getUserEmails(payload.userId);
    recipientEmail = emails.find((e) => e.is_primary)?.address || emails[0]?.address;
  }

  const finalSubject =
    payload.subject ||
    EMAIL_SUBJECTS[templateId] ||
    "Notification from ClouburstLab";

  const id = generateId();
  const now = Timestamp.now();
  const nextRetryAt = payload.nextRetryAt ? Timestamp.fromDate(payload.nextRetryAt) : now;

  const docData = {
    id,
    userId: payload.userId,
    to: recipientEmail || null,
    subject: finalSubject,
    templateId,
    data: JSON.stringify(payload.data || {}),
    retryCount: 0,
    isComplete: false,
    nextRetryAt,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("email_queue").doc(id).set(docData);

  return {
    ...docData,
    nextRetryAt: nextRetryAt.toDate(),
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
  };
}

async function saveFailedEmailToDb(payload: SaveQueuePayload) {
  try {
    const id = generateId();
    const now = Timestamp.now();
    await db.collection("email_queue").doc(id).set({
      id,
      userId: payload.userId,
      to: payload.to,
      subject: payload.subject,
      templateId: payload.templateId,
      data: JSON.stringify(payload.data),
      retryCount: 0,
      isComplete: false,
      nextRetryAt: now,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    handleError(error, "Failed to save email to queue DB");
    throw error;
  }
}

export interface GetPendingEmailQueueOptions {
  limit?: number;
  dueOnly?: boolean;
  userId?: string;
  templateId?: string;
  status?: "pending" | "completed" | "all";
}

export async function getPendingEmailQueue(options?: GetPendingEmailQueueOptions) {
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const status = options?.status || "pending";
  const now = Timestamp.now();

  let query = db.collection("email_queue") as FirebaseFirestore.Query;

  if (status === "pending") {
    query = query.where("isComplete", "==", false);
    if (options?.dueOnly !== false) {
      query = query.where("nextRetryAt", "<=", now);
    }
  } else if (status === "completed") {
    query = query.where("isComplete", "==", true);
  }

  if (options?.userId) {
    query = query.where("userId", "==", options.userId);
  }
  if (options?.templateId) {
    query = query.where("templateId", "==", options.templateId);
  }

  const [countSnap, pendingSnap] = await Promise.all([
    db.collection("email_queue").where("isComplete", "==", false).count().get(),
    query.limit(limit).get(),
  ]);

  const totalPending = countSnap.data().count;

  const parsedItems = await Promise.all(
    pendingSnap.docs.map(async (doc) => {
      const item = doc.data();
      let parsedData = {};
      try {
        parsedData = JSON.parse(item.data);
      } catch {
        parsedData = {};
      }

      let user = null;
      if (item.userId) {
        const u = await getUser(item.userId);
        if (u) {
          const emails = await getUserEmails(u.id);
          const primaryEmail = emails.find((e) => e.is_primary)?.address || null;
          user = {
            id: u.id,
            username: u.username,
            name: `${u.first_name} ${u.last_name}`.trim(),
            primaryEmail,
          };
        }
      }

      return {
        id: doc.id,
        userId: item.userId,
        to: item.to ?? null,
        subject: item.subject,
        templateId: item.templateId,
        retryCount: item.retryCount ?? 0,
        isComplete: item.isComplete ?? false,
        nextRetryAt: toDate(item.nextRetryAt),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
        data: parsedData,
        user,
      };
    })
  );

  return { totalPending, items: parsedItems };
}

export async function markEmailQueueComplete(ids: string | string[]) {
  const idList = Array.isArray(ids) ? ids : [ids];
  if (!idList.length) return { count: 0 };
  const batch = db.batch();
  const now = Timestamp.now();
  for (const id of idList) {
    batch.update(db.collection("email_queue").doc(id), {
      isComplete: true,
      updatedAt: now,
    });
  }
  await batch.commit();
  return { count: idList.length };
}

export async function markEmailQueueFailed(
  id: string,
  errorMsg?: string,
  retryInSeconds = 300,
  maxRetries = 5
) {
  void errorMsg;
  const doc = await db.collection("email_queue").doc(id).get();
  if (!doc.exists) return null;
  const current = doc.data()!;

  const newRetryCount = (current.retryCount ?? 0) + 1;
  const backoffSeconds = retryInSeconds * Math.pow(2, Math.min(newRetryCount - 1, 4));
  const nextRetryAt = new Date(Date.now() + backoffSeconds * 1000);
  const isComplete = newRetryCount >= maxRetries;

  if (isComplete) {
    await doc.ref.update({
      isComplete: true,
      updatedAt: Timestamp.now(),
    });
  } else {
    await doc.ref.update({
      retryCount: newRetryCount,
      nextRetryAt: Timestamp.fromDate(nextRetryAt),
      updatedAt: Timestamp.now(),
    });
  }

  return {
    id,
    retryCount: newRetryCount,
    isComplete,
    nextRetryAt,
  };
}

export async function updateEmailQueueStatus(ids: string[], isComplete: boolean): Promise<number> {
  if (!ids.length) return 0;
  const batch = db.batch();
  const now = Timestamp.now();
  for (const id of ids) {
    batch.update(db.collection("email_queue").doc(id), {
      isComplete,
      updatedAt: now,
    });
  }
  await batch.commit();
  return ids.length;
}

export async function deleteEmailQueueItems(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const batch = db.batch();
  for (const id of ids) {
    batch.delete(db.collection("email_queue").doc(id));
  }
  await batch.commit();
  return ids.length;
}

export async function purgeCompletedEmails(): Promise<number> {
  const snap = await db.collection("email_queue").where("isComplete", "==", true).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

export async function retryQueuedEmail(id: string): Promise<boolean> {
  const doc = await db.collection("email_queue").doc(id).get();
  if (!doc.exists) return false;
  const item = doc.data()!;

  if (item.isComplete) return false;

  let parsedData: Record<string, unknown> = {};
  try {
    parsedData = JSON.parse(item.data);
  } catch {
    parsedData = {};
  }

  let recipientEmail = item.to;
  if (!recipientEmail && item.userId) {
    const emails = await getUserEmails(item.userId);
    recipientEmail = emails.find((e) => e.is_primary)?.address || null;
  }

  if (!recipientEmail) {
    await markEmailQueueFailed(id, "Unresolvable recipient email", 3600);
    return false;
  }

  try {
    const provider = resolveEmailProvider();
    const result = await provider.send({
      to: recipientEmail,
      userId: item.userId,
      subject: item.subject,
      templateId: (item.templateId as TemplateId) || "custom",
      data: parsedData,
    });

    if (result.delivered) {
      await markEmailQueueComplete(id);
      return true;
    } else {
      await markEmailQueueFailed(id, result.reason || "Placeholder provider did not deliver");
      return false;
    }
  } catch (err) {
    await markEmailQueueFailed(id, String(err));
    return false;
  }
}

export async function getUserEmailQueue(
  userId: string,
  includeCompleted = false
) {
  try {
    let query = db.collection("email_queue").where("userId", "==", userId) as FirebaseFirestore.Query;
    if (!includeCompleted) {
      query = query.where("isComplete", "==", false);
    }
    const snap = await query.get();

    return snap.docs.map((doc) => {
      const data = doc.data();
      let parsedData = {};
      try {
        parsedData = JSON.parse(data.data);
      } catch {
        console.warn(`Failed to parse queue data for ID: ${doc.id}`);
      }

      return {
        id: doc.id,
        userId: data.userId,
        to: data.to ?? null,
        subject: data.subject,
        templateId: data.templateId,
        retryCount: data.retryCount ?? 0,
        isComplete: data.isComplete ?? false,
        nextRetryAt: toDate(data.nextRetryAt),
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
        data: parsedData,
      };
    });
  } catch (error) {
    handleError(error, `Failed to fetch email queue for user ${userId}`);
    return [];
  }
}
