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

type TemplateId = keyof TemplateDataMap;

const EMAIL_SUBJECTS: Record<TemplateId, string> = {
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
  const apiUrl = process.env.API_URL;
  const apiToken = process.env.API_TOKEN;

  if (!apiUrl || !apiToken) {
    console.warn("API_URL or API_TOKEN is missing. Email aborted.");
    return false;
  }

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
    throw new Error("Recipient address is required but could not be resolved!");
  }

  const finalSubject = subject || EMAIL_SUBJECTS[templateId];

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
        console.log(`Saved failed ${templateId} email to retry queue.`);
      } catch (dbError) {
        console.error("Critical: Failed to save to email queue DB!", dbError);
      }
    }
    return false;
  }
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