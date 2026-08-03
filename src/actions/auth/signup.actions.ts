"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signUpSchema, type SignUpValues } from "../../schema/auth.schema";
import { createSession } from "@/lib/session";
import { generateAndUploadAvatar } from "@/lib/avatar";
import { getErrorMessage, getErrorCode } from "@/misc/utils";

export async function signUp(data: SignUpValues) {
  try {
    const parsed = signUpSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "Invalid input data." };
    }
    
    const { firstName, lastName, email, password } = parsed.data;

    // Generate username from email prefix + random suffix
    let username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    if (!username) username = 'user';
    username = `${username}_${Math.floor(Math.random() * 10000)}`;

    const passwordHash = await bcrypt.hash(password, 10);
    
    const avatarUrl = await generateAndUploadAvatar(firstName, lastName);

    let user;
    try {
      user = await prisma.user.create({
        data: {
          first_name: firstName,
          last_name: lastName,
          username,
          avatar: avatarUrl,
          is_active: true,
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
    } catch (e: unknown) {
      const em = getErrorMessage(e);
      if (getErrorCode(e) === 'P2002') {
        return { success: false, error: "Username or email already exists." };
      }
      throw e;
    }

    await createSession(user.id, false);

    return { success: true, redirectUrl: "/profile" };
  } catch (e: unknown) {
    const em = getErrorMessage(e);
    return { success: false, error: em };
  }
}
