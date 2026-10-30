import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicProfile } from "@/actions/profile/public-profile";
import { getUserSession } from "@/lib/session";
import { getEnv } from "@/utils/env";
import JsonLd from "@/components/json-ld";
import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/landing/footer";
import { getServerTranslations, getDictionary } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import { BackgroundStars } from "@/components/landing/background-stars";
import { PublicProfileView } from "./public-profile-view";

interface PublicProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

const BASE_URL =
  getEnv("NEXT_PUBLIC_BASE_URL", true) || "https://clouburstlab.com";

export const instant = false;

export async function generateMetadata({
  params,
}: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  // Pass checkOwnerSession: false so metadata generation never reads cookies() / headers()
  const result = await getPublicProfile(username, { checkOwnerSession: false });

  if (result.status === "not_found") {
    return {
      title: {
        absolute: "User Not Found — clouburstlab user profile",
      },
      description: "The requested user profile does not exist on clouburstlab.",
      robots: { index: false, follow: false },
    };
  }

  if (result.status === "private") {
    return {
      title: {
        absolute: `Private Profile (@${result.userMeta.username}) — clouburstlab user profile`,
      },
      description: `@${result.userMeta.username}'s profile on clouburstlab is set to private.`,
      robots: { index: false, follow: false },
    };
  }

  const { profile } = result;
  const displayName = `${profile.first_name} ${profile.last_name}`.trim();
  const joinDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(profile.created_on));

  const description =
    profile.bio ||
    `${displayName} (@${profile.username}) — public developer & member profile within the clouburstlab ecosystem. Joined ${joinDate}.`;
  const profileUrl = `${BASE_URL}/p/${profile.username}`;
  const isIndexable = profile.visibility === "public";

  return {
    title: {
      absolute: `${displayName} (@${profile.username}) — clouburstlab user profile`,
    },
    description,
    alternates: {
      canonical: profileUrl,
    },
    robots: {
      index: isIndexable,
      follow: isIndexable,
      googleBot: {
        index: isIndexable,
        follow: isIndexable,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      siteName: "clouburstlab",
      title: `${displayName} (@${profile.username}) — clouburstlab user profile`,
      description,
      url: profileUrl,
      type: "profile",
      images: profile.avatar
        ? [
            {
              url: profile.avatar,
              width: 256,
              height: 256,
              alt: `${displayName}'s avatar`,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary",
      title: `${displayName} (@${profile.username}) — clouburstlab user profile`,
      description,
      images: profile.avatar ? [profile.avatar] : [],
    },
  };
}

async function PublicProfileDynamicContent({
  params,
}: PublicProfilePageProps) {
  const { username } = await params;

  const [result, session, { locale }] = await Promise.all([
    getPublicProfile(username),
    getUserSession(),
    getServerTranslations("landing"),
  ]);

  if (result.status === "not_found") {
    notFound();
  }

  const landingDict = await getDictionary(locale, "landing");
  const hasSession = !!session;
  const profileUrl = `${BASE_URL}/p/${username}`;

  if (result.status === "private") {
    return (
      <I18nProvider locale={locale} messages={landingDict}>
        <Navigation />
        <main className="flex-1 flex flex-col justify-center relative z-10">
          <PublicProfileView
            isPrivate={true}
            userMeta={result.userMeta}
            hasSession={hasSession}
            profileUrl={profileUrl}
          />
        </main>
        <Footer />
      </I18nProvider>
    );
  }

  const { profile } = result;
  const displayName = `${profile.first_name} ${profile.last_name}`.trim();
  const initials = `${profile.first_name[0] || ""}${profile.last_name[0] || ""}`.toUpperCase();
  const formattedJoinDate = new Intl.DateTimeFormat(locale || "en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(profile.created_on));

  const serializedProfile = {
    id: profile.id,
    username: profile.username,
    displayName,
    initials,
    avatar: profile.avatar,
    bio: profile.bio,
    pronouns: profile.pronouns,
    formattedJoinDate,
    isVerified: profile.is_verified,
    visibility: profile.visibility,
    isOwner: profile.is_owner,
    apps: profile.apps,
  };

  return (
    <I18nProvider locale={locale} messages={landingDict}>
      {/* Schema.org ProfilePage & Person Structured Data */}
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          dateCreated:
            profile.created_on instanceof Date
              ? profile.created_on.toISOString()
              : String(profile.created_on),
          mainEntity: {
            "@type": "Person",
            name: displayName,
            alternateName: `@${profile.username}`,
            identifier: profile.username,
            image: profile.avatar,
            description: profile.bio || undefined,
            url: profileUrl,
            worksFor: {
              "@type": "Organization",
              name: "clouburstlab",
              url: "https://clouburstlab.com",
            },
          },
        }}
      />

      {/* Global Navigation */}
      <Navigation />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center relative z-10">
        <PublicProfileView
          isPrivate={false}
          profile={serializedProfile}
          hasSession={hasSession}
          profileUrl={profileUrl}
        />
      </main>

      {/* Global Footer */}
      <Footer />
    </I18nProvider>
  );
}

export default function PublicProfilePage({ params }: PublicProfilePageProps) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-primary/5 dark:bg-primary/10 text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Decorative Background Elements (matching signin/signup/profile) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <BackgroundStars />
        <div className="absolute inset-0 bg-linear-to-tr from-primary/10 via-primary/5 to-transparent dark:from-primary/20" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 animate-pulse" />
        <div
          className="absolute top-32 right-32 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl opacity-50 animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <Suspense
        fallback={
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 py-24 animate-pulse">
            <div className="w-28 h-28 rounded-full bg-muted/40 mb-6" />
            <div className="h-8 w-56 bg-muted/40 rounded-xl mb-3" />
            <div className="h-4 w-36 bg-muted/30 rounded-lg" />
          </div>
        }
      >
        <PublicProfileDynamicContent params={params} />
      </Suspense>
    </div>
  );
}
