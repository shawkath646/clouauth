"use server";

import {
  getUser,
  updateUser,
  updateUsername,
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  updateUserPreferences,
} from "@/lib/users";
import { getUserSession } from "@/lib/session";
import { revalidatePath, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getErrorCode, handleError } from "@/utils/error";
import { getEnv } from "@/utils/env.server";
import { getDictionary, resolveLocale } from "@/lib/i18n/server";
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

export async function updateProfileName(data: NameValues, locale?: string) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const dict = await getDictionary("schema_profile", resolveLocale(locale));
    const nameSchema = getNameSchema(dict);

    const parsed = nameSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await updateUser(sessionData.user.id, {
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
    });

    revalidatePath("/profile");
    revalidateTag(`public-profile:${sessionData.user.username.toLowerCase()}`, "default");
    revalidateTag("public-profiles", "default");
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute updateProfileName");
    return { success: false, error: em };
  }
  redirect(locale ? `/${locale}/profile` : "/profile");
}

export async function updateProfileUsername(data: UsernameValues, locale?: string) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const dict = await getDictionary("schema_profile", resolveLocale(locale));
    const usernameSchema = getUsernameSchema(dict);

    const parsed = usernameSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await getUser(sessionData.user.id);

    if (user?.username_last_changed) {
      const daysSinceChange = Math.floor(
        (new Date().getTime() - new Date(user.username_last_changed).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceChange < 60) {
        return {
          success: false,
          error: `You must wait ${60 - daysSinceChange} more days before changing your username again.`,
        };
      }
    }

    try {
      await updateUsername(
        sessionData.user.id,
        user?.username || "",
        parsed.data.username
      );
    } catch (dbError: unknown) {
      if (getErrorCode(dbError) === "P2002") {
        return { success: false, error: "Username is already taken" };
      }
      throw dbError;
    }

    revalidatePath("/profile");
    if (user?.username) {
      revalidateTag(`public-profile:${user.username.toLowerCase()}`, "default");
    }
    revalidateTag(`public-profile:${parsed.data.username.toLowerCase()}`, "default");
    revalidateTag("public-profiles", "default");
  } catch (e: unknown) {
    return { success: false, error: handleError(e, "Failed to execute updateProfileUsername") };
  }
  redirect(locale ? `/${locale}/profile` : "/profile");
}

export async function updateProfileBio(data: BioValues, locale?: string) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const dict = await getDictionary("schema_profile", resolveLocale(locale));
    const bioSchema = getBioSchema(dict);

    const parsed = bioSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await updateUser(sessionData.user.id, {
      bio: parsed.data.bio || null,
    });

    revalidatePath("/profile");
    revalidateTag(`public-profile:${sessionData.user.username.toLowerCase()}`, "default");
    revalidateTag("public-profiles", "default");
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute updateProfileBio");
    return { success: false, error: em };
  }
  redirect(locale ? `/${locale}/profile` : "/profile");
}

export async function updateProfileAddress(data: AddressValues, locale?: string) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const dict = await getDictionary("schema_profile", resolveLocale(locale));
    const addressSchema = getAddressSchema(dict);

    const parsed = addressSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const addresses = await getUserAddresses(sessionData.user.id);
    const defaultAddress = addresses.find((a) => a.is_default) || addresses[0];

    const addressPayload = {
      address_1: parsed.data.address_1,
      address_2: parsed.data.address_2 || null,
      city: parsed.data.city,
      state: parsed.data.state || null,
      zip_code: parsed.data.zip_code,
      country: parsed.data.country,
      type: "home",
      is_default: true,
    };

    if (defaultAddress) {
      await updateUserAddress(sessionData.user.id, defaultAddress.id, addressPayload);
    } else {
      await addUserAddress(sessionData.user.id, addressPayload);
    }

    revalidatePath("/profile");
  } catch (e: unknown) {
    return { success: false, error: handleError(e, "Failed to execute updateProfileAddress") };
  }
  redirect(locale ? `/${locale}/profile` : "/profile");
}

export async function updateProfilePronouns(data: PronounsValues, locale?: string) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const dict = await getDictionary("schema_profile", resolveLocale(locale));
    const pronounsSchema = getPronounsSchema(dict);

    const parsed = pronounsSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await updateUser(sessionData.user.id, {
      pronouns: parsed.data.pronouns || null,
    });

    revalidatePath("/profile");
    revalidateTag(`public-profile:${sessionData.user.username.toLowerCase()}`, "default");
    revalidateTag("public-profiles", "default");
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute updateProfilePronouns");
    return { success: false, error: em };
  }
  redirect(locale ? `/${locale}/profile` : "/profile");
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
      const cookieStore = await cookies();
      cookieStore.set("theme_pref", validatedData.theme, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        secure: getEnv("NODE_ENV", true) === "production",
      });
      cookieStore.set("theme", validatedData.theme, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        secure: getEnv("NODE_ENV", true) === "production",
      });
    }
    if (validatedData.language) {
      updateData.language = validatedData.language;
    }
    if (validatedData.timezone) updateData.timezone = validatedData.timezone;

    await updateUserPreferences(sessionData.user.id, updateData);

    revalidatePath("/profile");
  } catch (e: unknown) {
    return { success: false, error: handleError(e, "Failed to execute updateProfilePreferences") };
  }
  return { success: true };
}

export async function updateProfileVisibility(visibility: import("@/types/preferences.types").ProfileVisibility) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    if (!["public", "link_only", "private"].includes(visibility)) {
      return { success: false, error: "Invalid profile visibility value." };
    }

    await updateUserPreferences(sessionData.user.id, {
      profile_visibility: visibility,
    });

    revalidatePath("/profile");
    revalidatePath("/profile/privacy");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: handleError(e, "Failed to execute updateProfileVisibility") };
  }
}
