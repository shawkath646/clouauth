import { prisma } from "@/lib/prisma";
import { handleError } from '@/utils/error';

interface TemplateDataMap {
  welcome: { name: string };
  verification_code: { code: string };
  account_recovery: { resetLink: string };
  password_changed: { name: string };
  account_deleted: { name: string };
  custom: Record<string, unknown>;
}


interface SaveQueuePayload {
  to: string;
  userId: string;
  subject: string;
  templateId: TemplateId;
  data: Record<string, unknown>;
}

export type TemplateId = keyof TemplateDataMap;

export const EMAIL_SUBJECTS: Record<TemplateId, string> = {
  welcome: "Welcome to ClouburstLab!",
  verification_code: "Your Verification Code",
  account_recovery: "Account Recovery",
  password_changed: "Your Password Was Changed",
  account_deleted: "Account Deleted",
  custom: "Notification from ClouburstLab"
};

const NON_RETRYABLE_TEMPLATES: Set<TemplateId> = new Set([
  'verification_code',
  'account_recovery'
]);

export interface EmailPayload<T extends TemplateId> {
  to?: string;
  userId: string;
  data: TemplateDataMap[T];
  subject?: string;
}

export async function sendEmail<T extends TemplateId>(
  templateId: T,
  { to, userId, data, subject }: EmailPayload<T>
): Promise<boolean> {
  let recipientEmail = to;

  if (!recipientEmail && userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emails: {
          where: { is_primary: true },
          take: 1
        }
      }
    });
    recipientEmail = user?.emails[0]?.address;
  }

  if (!recipientEmail) {
    console.error("Recipient address is required but could not be resolved for user:", userId);
    return false;
  }

  const finalSubject = subject || EMAIL_SUBJECTS[templateId] || "Notification from ClouburstLab";

  const apiUrl = process.env.API_URL;
  const apiToken = process.env.API_TOKEN;

  // If external email service is not configured, safely queue the email for the inter-services mailer worker
  if (!apiUrl || !apiToken) {
    if (!NON_RETRYABLE_TEMPLATES.has(templateId)) {
      try {
        await saveFailedEmailToDb({
          to: recipientEmail,
          userId,
          subject: finalSubject,
          templateId,
          data
        });
        return true;
      } catch (dbError) {
        console.error("Critical: Failed to save to email queue DB!", dbError);
      }
    }
    return false;
  }

  try {
    const response = await fetch(`${apiUrl}/service/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken
      },
      body: JSON.stringify({
        to: recipientEmail,
        subject: finalSubject,
        templateId,
        data
      })
    });

    if (!response.ok) {
      throw new Error(`Email service responded with ${response.status}`);
    }

    const result = await response.json();
    return Boolean(result.success);

  } catch (e: unknown) {
    handleError(e, `Failed to execute sendEmail for template: ${templateId}`);

    if (!NON_RETRYABLE_TEMPLATES.has(templateId)) {
      try {
        await saveFailedEmailToDb({
          to: recipientEmail,
          userId,
          subject: finalSubject,
          templateId,
          data
        });
      } catch (dbError) {
        console.error("Critical: Failed to save to email queue DB!", dbError);
      }
    }
    return false;
  }
}

export async function enqueueEmail<T extends TemplateId = TemplateId>(
  templateId: T,
  payload: {
    to?: string;
    userId: string;
    subject?: string;
    data: TemplateDataMap[T] | Record<string, unknown>;
    nextRetryAt?: Date;
  }
) {
  let recipientEmail = payload.to;

  if (!recipientEmail && payload.userId) {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        emails: {
          where: { is_primary: true },
          take: 1,
        },
      },
    });
    recipientEmail = user?.emails[0]?.address;
  }

  const finalSubject = payload.subject || EMAIL_SUBJECTS[templateId] || "Notification from ClouburstLab";

  return await prisma.emailQueue.create({
    data: {
      to: recipientEmail || null,
      userId: payload.userId,
      subject: finalSubject,
      templateId,
      data: JSON.stringify(payload.data || {}),
      nextRetryAt: payload.nextRetryAt || new Date(),
    },
  });
}

async function saveFailedEmailToDb(payload: SaveQueuePayload) {
  try {
    const queueItem = await prisma.emailQueue.create({
      data: {
        to: payload.to,
        userId: payload.userId,
        subject: payload.subject,
        templateId: payload.templateId,
        data: JSON.stringify(payload.data),
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });

    return queueItem;
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
  const isComplete =
    status === "completed" ? true : status === "all" ? undefined : false;

  const whereClause: Record<string, unknown> = {};
  if (isComplete !== undefined) {
    whereClause.isComplete = isComplete;
  }
  if (options?.dueOnly !== false && isComplete === false) {
    whereClause.nextRetryAt = { lte: new Date() };
  }
  if (options?.userId) {
    whereClause.userId = options.userId;
  }
  if (options?.templateId) {
    whereClause.templateId = options.templateId;
  }

  const [totalPending, items] = await Promise.all([
    prisma.emailQueue.count({ where: { isComplete: false } }),
    prisma.emailQueue.findMany({
      where: whereClause,
      orderBy: [
        { nextRetryAt: "asc" },
        { createdAt: "asc" },
      ],
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            first_name: true,
            last_name: true,
            emails: {
              where: { is_primary: true },
              select: { address: true },
            },
          },
        },
      },
    }),
  ]);

  const parsedItems = items.map((item) => {
    let parsedData = {};
    try {
      parsedData = JSON.parse(item.data);
    } catch {
      parsedData = {};
    }
    const resolvedTo = item.to || item.user?.emails[0]?.address || null;
    return {
      id: item.id,
      userId: item.userId,
      to: resolvedTo,
      subject: item.subject,
      templateId: item.templateId,
      data: parsedData,
      retryCount: item.retryCount,
      isComplete: item.isComplete,
      nextRetryAt: item.nextRetryAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      user: item.user
        ? {
            id: item.user.id,
            username: item.user.username,
            name: `${item.user.first_name} ${item.user.last_name}`.trim(),
            primaryEmail: item.user.emails[0]?.address || null,
          }
        : null,
    };
  });

  return { totalPending, items: parsedItems };
}

export async function markEmailQueueComplete(ids: string | string[]) {
  const idList = Array.isArray(ids) ? ids : [ids];
  return await prisma.emailQueue.updateMany({
    where: { id: { in: idList } },
    data: {
      isComplete: true,
    },
  });
}

export async function markEmailQueueFailed(
  id: string,
  errorMsg?: string,
  retryInSeconds = 300,
  maxRetries = 5
) {
  const current = await prisma.emailQueue.findUnique({ where: { id } });
  if (!current) return null;

  const newRetryCount = current.retryCount + 1;
  const isComplete = newRetryCount >= maxRetries;
  const backoffSeconds = retryInSeconds * Math.pow(2, Math.min(newRetryCount - 1, 4));
  const nextRetryAt = new Date(Date.now() + backoffSeconds * 1000);

  return await prisma.emailQueue.update({
    where: { id },
    data: {
      retryCount: newRetryCount,
      isComplete,
      nextRetryAt,
    },
  });
}

export async function retryQueuedEmail(id: string): Promise<boolean> {
  const item = await prisma.emailQueue.findUnique({
    where: { id },
    include: {
      user: {
        include: {
          emails: { where: { is_primary: true } },
        },
      },
    },
  });

  if (!item || item.isComplete) return false;

  let parsedData: Record<string, unknown> = {};
  try {
    parsedData = JSON.parse(item.data);
  } catch {
    parsedData = {};
  }

  const recipientEmail = item.to || item.user?.emails[0]?.address;
  if (!recipientEmail) {
    await markEmailQueueFailed(id, "Unresolvable recipient email", 3600);
    return false;
  }

  const apiUrl = process.env.API_URL;
  const apiToken = process.env.API_TOKEN;

  if (!apiUrl || !apiToken) {
    return false;
  }

  try {
    const response = await fetch(`${apiUrl}/service/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiToken,
      },
      body: JSON.stringify({
        to: recipientEmail,
        subject: item.subject,
        templateId: item.templateId,
        data: parsedData,
      }),
    });

    if (response.ok) {
      await markEmailQueueComplete(id);
      return true;
    } else {
      await markEmailQueueFailed(id, `Server responded with ${response.status}`);
      return false;
    }
  } catch (err) {
    await markEmailQueueFailed(id, String(err));
    return false;
  }
}

export async function getUserEmailQueue(userId: string, includeCompleted = false) {
  try {
    const queues = await prisma.emailQueue.findMany({
      where: {
        userId,
        ...(includeCompleted ? {} : { isComplete: false })
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return queues.map(queue => {
      let parsedData = {};
      try {
        parsedData = JSON.parse(queue.data);
      } catch {
        console.warn(`Failed to parse queue data for ID: ${queue.id}`);
      }

      return {
        ...queue,
        data: parsedData
      };
    });

  } catch (error) {
    handleError(error, `Failed to fetch email queue for user ${userId}`);
    return [];
  }
}