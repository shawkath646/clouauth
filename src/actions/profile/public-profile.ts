import { cache } from "react";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import type { ProfileVisibility } from "@/types/preferences.types";

export interface PublicProfileApp {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  website: string | null;
}

export interface PublicProfileData {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string;
  bio: string | null;
  pronouns: string | null;
  created_on: Date;
  is_verified: boolean;
  visibility: ProfileVisibility;
  is_owner: boolean;
  apps: PublicProfileApp[];
}

export type PublicProfileResult =
  | { status: "not_found" }
  | {
      status: "private";
      userMeta: {
        username: string;
        first_name: string;
      };
    }
  | {
      status: "found";
      profile: PublicProfileData;
    };

/**
 * Retrieves public profile information for a given username.
 * Respects user's profile transparency settings:
 * - public: accessible to all, indexable
 * - link_only: accessible with link, non-indexable
 * - private: hidden from guests, accessible only to the owner
 */
export const getPublicProfile = cache(async (username: string): Promise<PublicProfileResult> => {
  try {
    const cleanUsername = username.trim();

    const user = await prisma.user.findUnique({
      where: {
        username: cleanUsername,
      },
      select: {
        id: true,
        username: true,
        first_name: true,
        last_name: true,
        avatar: true,
        bio: true,
        pronouns: true,
        created_on: true,
        preferences: {
          select: {
            profile_visibility: true,
          },
        },
        emails: {
          where: { is_primary: true },
          select: { verified: true },
        },
        apps: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            website: true,
          },
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!user) {
      return { status: "not_found" };
    }

    const session = await getUserSession();
    const isOwner = session?.user?.id === user.id;
    const visibility = ((user.preferences?.profile_visibility as ProfileVisibility) || "public");

    // If private and the visitor is not the profile owner, hide detailed info
    if (visibility === "private" && !isOwner) {
      return {
        status: "private",
        userMeta: {
          username: user.username,
          first_name: user.first_name,
        },
      };
    }

    return {
      status: "found",
      profile: {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar: user.avatar,
        bio: user.bio,
        pronouns: user.pronouns,
        created_on: user.created_on,
        is_verified: !!user.emails[0]?.verified,
        visibility,
        is_owner: isOwner,
        apps: user.apps,
      },
    };
  } catch (error) {
    console.error("[getPublicProfile] Error fetching public profile:", error);
    return { status: "not_found" };
  }
});
