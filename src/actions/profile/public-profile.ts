import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import {
  getUserByUsername,
  getUserPreferences,
  getUserEmails,
} from "@/lib/users";
import { getUserApps } from "@/lib/oauth/clients";
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

/** One DB read per request, shared by generateMetadata, the OG image and the page. Cached across visitors. */
export const getProfileRecord = cache(async (username: string) => {
  "use cache";
  cacheLife("hours");
  cacheTag("public-profiles", `public-profile:${username.toLowerCase().trim()}`);

  const user = await getUserByUsername(username.trim());
  if (!user) return null;

  const [preferences, emails, apps] = await Promise.all([
    getUserPreferences(user.id),
    getUserEmails(user.id),
    getUserApps(user.id),
  ]);

  return {
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    avatar: user.avatar,
    bio: user.bio ?? null,
    pronouns: user.pronouns ?? null,
    created_on: new Date(user.created_on),
    preferences: {
      profile_visibility: preferences.profile_visibility,
    },
    emails: emails
      .filter((e) => e.is_primary)
      .map((e) => ({ verified: e.verified })),
    apps: apps.map((app) => ({
      id: app.id,
      name: app.name,
      description: app.description,
      icon: app.icon,
      website: app.website,
    })),
  };
});

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
