import { cache } from "react";
import prisma from "@/lib/prisma";
import type { ProfileVisibility } from "@/types/preferences.types";

/** Used when a user has no preferences row. Set this to match your schema default. */
const DEFAULT_VISIBILITY: ProfileVisibility = "private";

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
  | { status: "private"; userMeta: Pick<PublicProfileData, "username" | "first_name"> }
  | { status: "found"; profile: PublicProfileData };

/** One DB read per request, shared by generateMetadata, the OG image and the page. */
export const getProfileRecord = cache((username: string) =>
  prisma.user.findUnique({
    where: { username: username.trim() },
    select: {
      id: true,
      username: true,
      first_name: true,
      last_name: true,
      avatar: true,
      bio: true,
      pronouns: true,
      created_on: true,
      preferences: { select: { profile_visibility: true } },
      emails: { where: { is_primary: true }, select: { verified: true } },
      apps: {
        select: { id: true, name: true, description: true, icon: true, website: true },
        orderBy: { created_at: "desc" },
      },
    },
  })
);

type ProfileRecord = NonNullable<Awaited<ReturnType<typeof getProfileRecord>>>;

/** Pure: decides what a given viewer may see. Owners can always see their own profile. */
export function resolvePublicProfile(
  user: ProfileRecord | null,
  viewerId?: string | null
): PublicProfileResult {
  if (!user) return { status: "not_found" };

  const { preferences, emails, ...fields } = user;
  const visibility =
    (preferences?.profile_visibility as ProfileVisibility | undefined) ?? DEFAULT_VISIBILITY;
  const is_owner = Boolean(viewerId) && viewerId === fields.id;

  if (visibility === "private" && !is_owner) {
    return {
      status: "private",
      userMeta: { username: fields.username, first_name: fields.first_name },
    };
  }

  return {
    status: "found",
    profile: { ...fields, visibility, is_owner, is_verified: emails[0]?.verified ?? false },
  };
}

export const getPublicProfile = async (username: string, viewerId?: string | null) =>
  resolvePublicProfile(await getProfileRecord(username), viewerId);