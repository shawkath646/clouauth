import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import iconLight from "@/assets/icon_light.png";
import iconDark from "@/assets/icon_dark.png";
import { BackgroundStars } from "@/components/landing/background-stars";
import { I18nProvider } from "@/lib/i18n/provider";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { getFullProfile } from "@/actions/profile/get-profile";
import { redirect } from "next/navigation";
import { ProfileLayoutClient } from "@/components/profile/profile-layout-client";
import { SignOutButton } from "@/components/profile/sign-out-button";
import { Shield } from "lucide-react";
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

// Next.js 16 authenticated layout: allows dynamic database session lookups without prerender failure
export const instant = false;

async function ProfileDynamicShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  const [
    schemaProfile,
    schemaSecurity,
    schemaApp,
    profilePersonal,
    profileSecurity,
    profileApps,
    profileNav,
    result,
  ] = await Promise.all([
    getDictionary(locale, "schema_profile"),
    getDictionary(locale, "schema_security"),
    getDictionary(locale, "schema_app"),
    getDictionary(locale, "profile_personal"),
    getDictionary(locale, "profile_security"),
    getDictionary(locale, "profile_apps"),
    getDictionary(locale, "profile_nav"),
    getFullProfile(),
  ]);

  const allMessages = {
    ...schemaProfile,
    ...schemaSecurity,
    ...schemaApp,
    ...profilePersonal,
    ...profileSecurity,
    ...profileApps,
    ...profileNav,
  };

  if (!result.success || !result.data) {
    if (result.error === "Unauthorized") {
      redirect("/signin");
    }
    throw new Error(result.error || "Failed to load profile data.");
  }

  return (
    <I18nProvider locale={locale} messages={allMessages}>
      <ProfileLayoutClient profile={result.data}>
        {children}
      </ProfileLayoutClient>
    </I18nProvider>
  );
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col relative bg-primary/5 dark:bg-primary/5">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <BackgroundStars />
        <div className="absolute inset-0 bg-linear-to-tr from-primary/10 via-primary/5 to-transparent dark:from-primary/20" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 animate-pulse" />
        <div
          className="absolute top-32 right-32 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl opacity-50 animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-primary/20 bg-background/70 dark:bg-card/40 backdrop-blur-xl">
        <div className="w-full max-w-360 mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
          {/* Left: ClouAuth Brand matching Global Navbar */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary/10 p-1.5 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold tracking-tight text-lg">ClouAuth</span>
          </Link>

          {/* Right: clouburstlab logo before SignOutButton */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="https://clouburstlab.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center hover:opacity-85 transition-opacity"
            >
              {/* Dark Mode Logo */}
              <Image
                src={iconDark}
                alt="clouburstlab"
                priority
                className="hidden dark:block w-32 h-auto object-contain"
              />
              {/* Light Mode Logo */}
              <Image
                src={iconLight}
                alt="clouburstlab"
                priority
                className="block dark:hidden w-32 h-auto object-contain"
              />
            </Link>

            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative z-10 w-full max-w-360 mx-auto p-4 sm:p-8">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 animate-pulse">
              <div className="h-96 rounded-2xl bg-card/50 border border-border/40" />
              <div className="space-y-6">
                <div className="h-40 rounded-2xl bg-card/50 border border-border/40" />
                <div className="h-72 rounded-2xl bg-card/50 border border-border/40" />
              </div>
            </div>
          }
        >
          <ProfileDynamicShell>{children}</ProfileDynamicShell>
        </Suspense>
      </div>
    </div>
  );
}
