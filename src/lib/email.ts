import { handleError } from "@/utils/utils";

export type TemplateId =
  | 'welcome'
  | 'verification_code'
  | 'account_recovery'
  | 'password_changed'
  | 'account_deleted';

interface EmailPayload {
  to: string;
  subject: string;
  templateId: TemplateId;
  data?: { name: string }
  | { resetLink: string }
  | { code: string };
}

export async function sendEmail({ to, subject, templateId, data }: EmailPayload) {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    console.warn("API_URL is not set. Email will not be sent.");
    return false;
  }

  try {
    const response = await fetch(`${apiUrl}/service/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-secret-token'
      },
      body: JSON.stringify({
        to,
        subject,
        templateId,
        data
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to send email (${response.status}):`, errorText);
      return false;
    }

    const result = await response.json();
    return result.success;
  } catch (e: unknown) {
    handleError(e, "Failed to execute sendEmail");
    return false;
  }
}

export async function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: "Welcome to ClouburstLab!",
    templateId: 'welcome',
    data: { name }
  });
}

export async function sendVerificationCodeEmail(to: string, code: string) {
  return sendEmail({
    to,
    subject: "Your Verification Code",
    templateId: 'verification_code',
    data: { code }
  });
}

export async function sendAccountRecoveryEmail(to: string, resetLink: string) {
  return sendEmail({
    to,
    subject: "Account Recovery",
    templateId: 'account_recovery',
    data: { resetLink }
  });
}

export async function sendPasswordChangedEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: "Your Password Was Changed",
    templateId: 'password_changed',
    data: { name }
  });
}

export async function sendAccountDeletedEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: "Account Deleted",
    templateId: 'account_deleted',
    data: { name }
  });
}
