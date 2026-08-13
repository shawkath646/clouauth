import Link from "next/link";
import Image from "next/image";
import iconLight from "@/assets/icon_light.png";
import iconDark from "@/assets/icon_dark.png";
import { BackgroundStars } from "@/components/landing/background-stars";
import { I18nProvider } from "@/lib/i18n/provider";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { getFullProfile } from "@/actions/profile/get-profile.actions";
import { redirect } from "next/navigation";
import { ProfileLayoutClient } from "@/components/profile/profile-layout-client";
import { SignOutButton } from "@/components/profile/sign-out-button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s — My Account | clouburstlab",
    default: "My Account",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  openGraph: null,
  twitter: null,
};

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  
  const [schemaProfile, schemaSecurity, schemaApp, profilePersonal, profileSecurity, profileApps, profileNav, result] = await Promise.all([
    getDictionary(locale, "schema_profile"),
    getDictionary(locale, "schema_security"),
    getDictionary(locale, "schema_app"),
    getDictionary(locale, "profile_personal"),
    getDictionary(locale, "profile_security"),
    getDictionary(locale, "profile_apps"),
    getDictionary(locale, "profile_nav"),
    getFullProfile()
  ]);

  const allMessages = {
    ...schemaProfile,
    ...schemaSecurity,
    ...schemaApp,
    ...profilePersonal,
    ...profileSecurity,
    ...profileApps,
    ...profileNav
  };
  
  if (!result.success || !result.data) {
    redirect("/signin");
  }

  return (
    <I18nProvider messages={allMessages}>
      <div className="min-h-screen flex flex-col relative bg-primary/5 dark:bg-primary/5">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <BackgroundStars />
        <div className="absolute inset-0 bg-linear-to-tr from-primary/10 via-primary/5 to-transparent dark:from-primary/20" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 animate-pulse" />
        <div className="absolute top-32 right-32 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl opacity-50 animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-primary/20 bg-background/70 dark:bg-card/40 backdrop-blur-xl">
        <div className="w-full max-w-360 mx-auto flex h-16 items-center justify-between px-4 sm:px-8">

          <Link href="https://clouburstlab.com"  className="flex items-center">
            {/* Dark Mode Logo */}
            <Image
              src={iconDark}
              alt="clouburstlab"
              width={144}
              height={40}
              priority
              className="hidden dark:block object-contain"
            />
            {/* Light Mode Logo */}
            <Image
              src={iconLight}
              alt="clouburstlab"
              width={144}
              height={40}
              priority
              className="block dark:hidden object-contain"
            />
          </Link>

            <SignOutButton />

        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative z-10 w-full max-w-360 mx-auto p-4 sm:p-8">
        <ProfileLayoutClient profile={result.data}>
          {children}
        </ProfileLayoutClient>
      </div>
    </div>
    </I18nProvider>
  );
}
