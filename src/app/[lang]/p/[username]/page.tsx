import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getProfileRecord,
  getPublicProfile,
  resolvePublicProfile,
  type PublicProfileData,
} from "@/actions/profile/public-profile";
import { getUserSession } from "@/lib/session";
import { getEnv } from "@/utils/utils";
import { getLocalizedAlternates } from "@/utils/seo";
import { formatMonthYear, getDisplayName, getInitials } from "@/utils/profile";
import { getDictionary, resolveLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/config";
import JsonLd from "@/components/json-ld";
import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/layout/footer";
import { BackgroundStars } from "@/components/landing/background-stars";
import { PublicProfileView } from "./public-profile-view";

interface PublicProfilePageProps {
  params: Promise<{ lang: string; username: string }>;
}

const SITE = "clouburstlab";
const BASE_URL = getEnv("NEXT_PUBLIC_BASE_URL", true);

const profileUrl = (locale: string, username: string) => `${BASE_URL}/${locale}/p/${username}`;
const profileTitle = (name: string, username: string) =>
  `${name} (@${username}) — ${SITE} user profile`;

const noIndexMetadata = (title: string, description: string): Metadata => ({
  title: { absolute: title },
  description,
  robots: { index: false, follow: false },
});

/* ------------------------------ metadata ------------------------------ */

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { lang, username } = await params;
  const locale = resolveLocale(lang);
  const result = await getPublicProfile(username);

  if (result.status === "not_found") {
    return noIndexMetadata(
      `User Not Found — ${SITE} user profile`,
      `The requested user profile does not exist on ${SITE}.`
    );
  }

  if (result.status === "private") {
    const handle = `@${result.userMeta.username}`;
    return noIndexMetadata(
      `Private Profile (${handle}) — ${SITE} user profile`,
      `${handle}'s profile on ${SITE} is set to private.`
    );
  }

  const { profile } = result;
  const displayName = getDisplayName(profile.first_name, profile.last_name);
  const title = profileTitle(displayName, profile.username);
  const description =
    profile.bio ||
    `${displayName} (@${profile.username}) — public developer & member profile within the ${SITE} ecosystem. ` +
      `Joined ${formatMonthYear(profile.created_on, locale)}.`;
  const indexable = profile.visibility === "public";

  return {
    title: { absolute: title },
    description,
    alternates: getLocalizedAlternates(`/p/${profile.username}`, locale),
    robots: {
      index: indexable,
      follow: indexable,
      googleBot: {
        index: indexable,
        follow: indexable,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      siteName: SITE,
      title,
      description,
      url: profileUrl(locale, profile.username),
      type: "profile",
      images: profile.avatar
        ? [{ url: profile.avatar, width: 256, height: 256, alt: `${displayName}'s avatar` }]
        : [],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: profile.avatar ? [profile.avatar] : [],
    },
  };
}

/* ------------------------------ helpers ------------------------------ */

function toViewProfile(profile: PublicProfileData, locale: Locale) {
  return {
    id: profile.id,
    username: profile.username,
    displayName: getDisplayName(profile.first_name, profile.last_name),
    initials: getInitials(profile.first_name, profile.last_name),
    avatar: profile.avatar,
    bio: profile.bio,
    pronouns: profile.pronouns,
    formattedJoinDate: formatMonthYear(profile.created_on, locale),
    isVerified: profile.is_verified,
    visibility: profile.visibility,
    isOwner: profile.is_owner,
    apps: profile.apps,
  };
}

function buildProfileSchema(profile: PublicProfileData, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    dateCreated: profile.created_on.toISOString(),
    mainEntity: {
      "@type": "Person",
      name: getDisplayName(profile.first_name, profile.last_name),
      alternateName: `@${profile.username}`,
      identifier: profile.username,
      image: profile.avatar,
      description: profile.bio || undefined,
      url,
      worksFor: { "@type": "Organization", name: SITE, url: "https://clouburstlab.com" },
    },
  };
}

/* ------------------------------ content ------------------------------ */

async function PublicProfileDynamicContent({ params }: PublicProfilePageProps) {
  const { lang, username } = await params;
  const locale = resolveLocale(lang);

  const [session, record, landingDict, commonDict] = await Promise.all([
    getUserSession(), // dynamic (cookies), so this must stay inside <Suspense>
    getProfileRecord(username),
    getDictionary("landing", locale),
    getDictionary("common", locale),
  ]);

  // Adjust to your session shape
  const result = resolvePublicProfile(record, session?.user?.id);
  if (result.status === "not_found") notFound();

  const url = profileUrl(locale, username);

  return (
    <>
      {result.status === "found" && <JsonLd schema={buildProfileSchema(result.profile, url)} />}

      <Navigation locale={locale} dict={landingDict.navigation} />

      <main className="flex-1 flex flex-col justify-center relative z-10">
        {result.status === "private" ? (
          <PublicProfileView isPrivate userMeta={result.userMeta} profileUrl={url} locale={locale} />
        ) : (
          <PublicProfileView
            isPrivate={false}
            profile={toViewProfile(result.profile, locale)}
            profileUrl={url}
            locale={locale}
          />
        )}
      </main>

      <Footer locale={locale} dict={landingDict.footer} commonDict={commonDict} />
    </>
  );
}

/* ------------------------------ page shell ------------------------------ */

function ProfileBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <BackgroundStars />
      <div className="absolute inset-0 bg-linear-to-tr from-primary/10 via-primary/5 to-transparent dark:from-primary/20" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 animate-pulse" />
      <div
        className="absolute top-32 right-32 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl opacity-50 animate-pulse"
        style={{ animationDelay: "2s" }}
      />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 py-24 animate-pulse">
      <div className="w-28 h-28 rounded-full bg-muted/40 mb-6" />
      <div className="h-8 w-56 bg-muted/40 rounded-xl mb-3" />
      <div className="h-4 w-36 bg-muted/30 rounded-lg" />
    </div>
  );
}

export default function PublicProfilePage({ params }: PublicProfilePageProps) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-primary/5 dark:bg-primary/10 text-foreground selection:bg-primary/20 selection:text-primary">
      <ProfileBackground />
      <Suspense fallback={<ProfileSkeleton />}>
        <PublicProfileDynamicContent params={params} />
      </Suspense>
    </div>
  );
}