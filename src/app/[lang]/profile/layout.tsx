import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { connection } from "next/server";
import { BackgroundStars } from "@/components/landing/background-stars";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";
import { getFullProfile } from "@/actions/profile/get-profile";
import { ProfileLayoutClient } from "@/components/profile/profile-layout-client";
import { SignOutButton } from "@/components/profile/sign-out-button";
import { Shield } from "lucide-react";
import iconLight from "@/assets/icon_light.png";
import iconDark from "@/assets/icon_dark.png";
import type { Locale } from "@/lib/i18n/config";
import { Dictionaries } from "@/types/i18n.types";

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

async function DynamicProfileLayout({
  locale,
  navDict,
  children,
}: {
  locale: Locale;
  navDict: Dictionaries["profile_nav"];
  children: React.ReactNode;
}) {
  await connection();
  const result = await getFullProfile();

  if (!result.success || !result.data) {
    if (result.error === "Unauthorized") {
      redirect(`/${locale}/signin`);
    }
    throw new Error(result.error || "Failed to load profile data.");
  }

  return (
    <ProfileLayoutClient profile={result.data} locale={locale} navDict={navDict}>
      {children}
    </ProfileLayoutClient>
  );
}

function ProfileLayoutSkeleton({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-8">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="h-64 w-full rounded-2xl bg-card/40 border border-primary/10 animate-pulse" />
        </aside>
        <section className="flex-1 min-w-0">
          <div className="h-28 w-full rounded-2xl bg-card/40 border border-primary/10 animate-pulse mb-8" />
          {children}
        </section>
      </div>
    </div>
  );
}

export default async function ProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = resolveLocale(lang);

  const navDict = await getDictionary("profile_nav", locale);

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
          <Link href={`/${locale}`} className="flex items-center gap-2 group">
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

            <SignOutButton locale={locale} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative z-10 w-full max-w-360 mx-auto p-4 sm:p-8">
        <Suspense fallback={<ProfileLayoutSkeleton>{children}</ProfileLayoutSkeleton>}>
          <DynamicProfileLayout locale={locale} navDict={navDict}>
            {children}
          </DynamicProfileLayout>
        </Suspense>
      </div>
    </div>
  );
}
