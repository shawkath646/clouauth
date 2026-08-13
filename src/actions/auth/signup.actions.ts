"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSignUpSchema, type SignUpValues } from "../../schema/auth.schema";
import { createSession } from "@/lib/session";
import { generateAndUploadAvatar } from "@/lib/avatar";
import { handleError, getErrorCode } from "@/utils/utils";
import { getServerTranslations } from "@/lib/i18n/server";
import crypto from "crypto";

export async function signUp(data: SignUpValues) {
  try {
    const { t } = await getServerTranslations("schema_auth");
    const signUpSchema = getSignUpSchema(t);
    const parsed = signUpSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "Invalid input data." };
    }
    
    const { firstName, lastName, email, password } = parsed.data;

    const passwordHash = await bcrypt.hash(password, 12);
    
    const avatarUrl = await generateAndUploadAvatar(firstName, lastName);

    let user;
    let retries = 0;
    const maxRetries = 5;
    const prefix = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'user';

    while (retries < maxRetries) {
        const suffix = crypto.randomBytes(4).toString('hex');
        const username = `${prefix}_${suffix}`;
        try {
          user = await prisma.user.create({
            data: {
              first_name: firstName,
              last_name: lastName,
              username,
              avatar: avatarUrl,
              account_status: {
                create: {
                  is_active: true
                }
              },
              emails: {
                create: {
                  address: email,
                  is_primary: true,
                  verified: false
                }
              },
              password: {
                create: {
                  password_hash: passwordHash
                }
              }
            }
          });
          break;
        } catch (e: unknown) {
          if (getErrorCode(e) === 'P2002' && retries < maxRetries - 1) {
            retries++;
            continue;
          }
          handleError(e, "Failed to execute signUp");
          if (getErrorCode(e) === 'P2002') {
            return { success: false, error: "Email already exists." };
          }
          throw e;
        }
    }

    if (!user) {
        return { success: false, error: "Failed to generate unique username." };
    }

    await createSession(user.id, false);

    return { success: true, redirectUrl: "/profile" };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute signUp");
    return { success: false, error: em };
  }
}
