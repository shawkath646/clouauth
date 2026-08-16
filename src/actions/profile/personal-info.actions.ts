"use server";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getErrorCode, handleError } from "@/utils/error";
import { getServerTranslations } from "@/lib/i18n/server";
import { z } from "zod";

import {
  getNameSchema,
  getUsernameSchema,
  getBioSchema,
  getPronounsSchema,
  getAddressSchema,
  NameValues,
  UsernameValues,
  BioValues,
  PronounsValues,
  AddressValues,
} from "@/schema/profile.schema";
import { DBUserPreference } from "@/types/preferences.types";

export async function updateProfileName(data: NameValues) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const { t } = await getServerTranslations("schema_profile");
    const nameSchema = getNameSchema(t);

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
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute updateProfileName");
    return { success: false, error: em };
  }
  redirect("/profile");
}

export async function updateProfileUsername(data: UsernameValues) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const { t } = await getServerTranslations("schema_profile");
    const usernameSchema = getUsernameSchema(t);

    const parsed = usernameSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
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

    try {
      await prisma.user.update({
        where: { id: sessionData.user.id },
        data: {
          username: parsed.data.username,
          username_last_changed: new Date()
        },
      });
    } catch (dbError: unknown) {
      if (getErrorCode(dbError) === 'P2002') {
        return { success: false, error: "Username is already taken" };
      }
      throw dbError;
    }

    revalidatePath("/profile");
  } catch (e: unknown) {
    return { success: false, error: handleError(e, "Failed to execute updateProfileUsername") };
  }
  redirect("/profile");
}

export async function updateProfileBio(data: BioValues) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const { t } = await getServerTranslations("schema_profile");
    const bioSchema = getBioSchema(t);

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
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute updateProfileBio");
    return { success: false, error: em };
  }
  redirect("/profile");
}

export async function updateProfileAddress(data: AddressValues) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const { t } = await getServerTranslations("schema_profile");
    const addressSchema = getAddressSchema(t);

    const parsed = addressSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const defaultAddress = await prisma.address.findFirst({
      where: { user_id: sessionData.user.id },
      orderBy: { is_default: "desc" }
    });

    if (defaultAddress) {
      await prisma.address.update({
        where: { id: defaultAddress.id },
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
  } catch (e: unknown) {
    return { success: false, error: handleError(e, "Failed to execute updateProfileAddress") };
  }
  redirect("/profile");
}

export async function updateProfilePronouns(data: PronounsValues) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const { t } = await getServerTranslations("schema_profile");
    const pronounsSchema = getPronounsSchema(t);

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
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute updateProfilePronouns");
    return { success: false, error: em };
  }
  redirect("/profile");
}

const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.string().min(2).max(10).regex(/^[a-z]{2}(-[A-Z]{2})?$/).optional(),
  timezone: z.string().max(50).optional(),
});

export async function updateProfilePreferences(data: z.infer<typeof preferencesSchema>) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const parsed = preferencesSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "Invalid preferences data." };
    }
    const validatedData = parsed.data;

    const updateData: Partial<DBUserPreference> = {};
    if (validatedData.theme) {
      updateData.theme = validatedData.theme;
      (await cookies()).set("theme_pref", validatedData.theme, { path: "/", httpOnly: false, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    }
    if (validatedData.language) {
      updateData.language = validatedData.language;
      (await cookies()).set('NEXT_LOCALE', validatedData.language, { maxAge: 60 * 60 * 24 * 365, path: '/' });
    }
    if (validatedData.timezone) updateData.timezone = validatedData.timezone;

    await prisma.userPreference.upsert({
      where: { user_id: sessionData.user.id },
      update: updateData,
      create: {
        user_id: sessionData.user.id,
        ...updateData,
      },
    });

    revalidatePath("/profile");
  } catch (e: unknown) {
    return { success: false, error: handleError(e, "Failed to execute updateProfilePreferences") };
  }
  return { success: true };
}
