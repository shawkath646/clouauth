import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import iconLight from "@/assets/icon_light.png";
import iconDark from "@/assets/icon_dark.png";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BackgroundStars } from "@/components/landing/background-stars";

import { I18nProvider } from "@/lib/i18n/provider";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { FooterLinks } from "@/components/landing/footer-links";
import { ReCaptchaDisclaimer } from "@/lib/recaptcha/client";

async function AuthLocalizedShell({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const [commonDict, schemaAuthDict] = await Promise.all([
    getDictionary(locale, "common"),
    getDictionary(locale, "schema_auth"),
  ]);

  const mergedDict = { ...commonDict, ...schemaAuthDict };

  return (
    <I18nProvider
      locale={locale}
      messages={
        mergedDict as unknown as import("@/types/i18n.types").Dictionary<"common">
      }
    >
      {/* Dynamic Content Wrapper */}
      <div className="flex-1 relative z-10 w-full max-w-6xl mx-auto px-4 flex flex-col justify-center py-20 sm:py-12">
        {children}
      </div>

      {/* Footer Area */}
      <div className="relative mt-auto w-full p-4 sm:p-5 z-50 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pointer-events-none">
        <div className="pointer-events-auto">
          <FooterLinks />
        </div>

        <div className="pointer-events-auto text-center max-w-xs sm:max-w-sm md:max-w-md">
          <ReCaptchaDisclaimer />
        </div>

        <Link
          href="/"
          className="transition-transform hover:scale-101 pointer-events-auto shrink-0"
        >
          {/* Light Mode Logo */}
          <Image
            src={iconLight}
            alt="clouburstlab Logo"
            className="w-32 sm:w-40 h-auto object-contain dark:hidden"
            priority
          />
          {/* Dark Mode Logo */}
          <Image
            src={iconDark}
            alt="clouburstlab Logo"
            className="w-40 sm:w-48 h-auto object-contain hidden dark:block"
            priority
          />
        </Link>
      </div>
    </I18nProvider>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-primary/5 dark:bg-primary/10 overflow-hidden">
      <BackgroundStars />
      <div className="absolute top-5 right-5 z-50">
        <ThemeToggle />
      </div>

      {/* Decorative Background Elements */}
      <div className="absolute inset-0 bg-linear-to-tr from-primary/10 via-primary/5 to-transparent dark:from-primary/20 pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 animate-pulse pointer-events-none" />
      <div
        className="absolute top-32 right-32 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl opacity-50 animate-pulse pointer-events-none"
        style={{ animationDelay: "2s" }}
      />

      <Suspense
        fallback={
          <div className="flex-1 relative z-10 w-full max-w-6xl mx-auto px-4 flex flex-col justify-center py-20 sm:py-12">
            <div className="w-full max-w-md p-5 sm:p-8 md:p-10 bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 shadow-2xl rounded-3xl flex flex-col items-center justify-center min-h-[480px] mx-auto animate-pulse">
              <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
              <div className="h-4 w-32 bg-muted rounded mb-2" />
              <div className="h-3 w-48 bg-muted/60 rounded" />
            </div>
          </div>
        }
      >
        <AuthLocalizedShell>{children}</AuthLocalizedShell>
      </Suspense>
    </div>
  );
}
