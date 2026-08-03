"use server";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getErrorMessage } from "@/misc/utils";

const nameSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(50),
  last_name: z.string().min(1, "Last name is required").max(50),
});

const usernameSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
});

const bioSchema = z.object({
  bio: z.string().max(500, "Bio cannot exceed 500 characters").nullable(),
});

const pronounsSchema = z.object({
  pronouns: z.string().max(20).nullable(),
});

const addressSchema = z.object({
  address_1: z.string().min(1, "Address Line 1 is required").max(100),
  address_2: z.string().max(100).optional().nullable(),
  city: z.string().min(1, "City is required").max(50),
  state: z.string().max(50).optional().nullable(),
  zip_code: z.string().min(1, "ZIP/Postal code is required").max(20),
  country: z.string().min(1, "Country is required").max(50),
});

export async function updateProfileName(data: z.infer<typeof nameSchema>) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const parsed = nameSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await prisma.user.update({
      where: { id: sessionData.user.id },
      data: {
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
      },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (e: unknown) {
    const em = getErrorMessage(e);
    return { success: false, error: em };
  }
}

export async function updateProfileUsername(data: z.infer<typeof usernameSchema>) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const parsed = usernameSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    // Check if username is taken by another user
    const existing = await prisma.user.findUnique({
      where: { username: parsed.data.username },
    });

    if (existing && existing.id !== sessionData.user.id) {
      return { success: false, error: "Username is already taken" };
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.user.id },
      select: { username_last_changed: true }
    });

    if (user?.username_last_changed) {
      const daysSinceChange = Math.floor((new Date().getTime() - user.username_last_changed.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceChange < 60) {
        return { success: false, error: `You must wait ${60 - daysSinceChange} more days before changing your username again.` };
      }
    }

    await prisma.user.update({
      where: { id: sessionData.user.id },
      data: {
        username: parsed.data.username,
        username_last_changed: new Date()
      },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (e: unknown) {
    const em = getErrorMessage(e);
    console.error("Username update error:", e);
    return { success: false, error: em };
  }
}

export async function updateProfileBio(data: z.infer<typeof bioSchema>) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const parsed = bioSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await prisma.user.update({
      where: { id: sessionData.user.id },
      data: {
        bio: parsed.data.bio,
      },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (e: unknown) {
    const em = getErrorMessage(e);
    return { success: false, error: em };
  }
}

export async function updateProfileAddress(data: z.infer<typeof addressSchema>) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const parsed = addressSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    // Find if user has a default address, or any address
    const userAddresses = await prisma.address.findMany({
      where: { user_id: sessionData.user.id },
      orderBy: { is_default: 'desc' }
    });

    if (userAddresses.length > 0) {
      // Update existing
      await prisma.address.update({
        where: { id: userAddresses[0].id },
        data: {
          address_1: parsed.data.address_1,
          address_2: parsed.data.address_2 || "",
          city: parsed.data.city,
          state: parsed.data.state || "",
          zip_code: parsed.data.zip_code,
          country: parsed.data.country,
        },
      });
    } else {
      // Create new
      await prisma.address.create({
        data: {
          user_id: sessionData.user.id,
          type: "home",
          is_default: true,
          address_1: parsed.data.address_1,
          address_2: parsed.data.address_2 || "",
          city: parsed.data.city,
          state: parsed.data.state || "",
          zip_code: parsed.data.zip_code,
          country: parsed.data.country,
        },
      });
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (e: unknown) {
    const em = getErrorMessage(e);
    return { success: false, error: em };
  }
}

export async function updateProfilePronouns(data: z.infer<typeof pronounsSchema>) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const parsed = pronounsSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await prisma.user.update({
      where: { id: sessionData.user.id },
      data: {
        pronouns: parsed.data.pronouns,
      },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (e: unknown) {
    const em = getErrorMessage(e);
    return { success: false, error: em };
  }
}

