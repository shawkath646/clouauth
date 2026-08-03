import Image from "next/image";
import Link from "next/link";
import iconLight from "@/assets/icon_light.png";
import iconDark from "@/assets/icon_dark.png";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BackgroundStars } from "@/components/landing/background-stars";

import { I18nProvider } from "@/lib/i18n/provider";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { FooterLinks } from "@/components/landing/footer-links";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const commonDict = await getDictionary(locale, 'common');

  return (
    <I18nProvider locale={locale} messages={commonDict}>
      <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-primary/5 dark:bg-primary/10 overflow-hidden">
        <BackgroundStars />
        <div className="absolute top-5 right-5 z-50">
          <ThemeToggle />
        </div>
        
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 bg-linear-to-tr from-primary/10 via-primary/5 to-transparent dark:from-primary/20 pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 animate-pulse pointer-events-none" />
        <div className="absolute top-32 right-32 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl opacity-50 animate-pulse pointer-events-none" style={{ animationDelay: "2s" }} />

        {/* Dynamic Content Wrapper */}
        <div className="flex-1 relative z-10 w-full max-w-6xl mx-auto px-4 flex flex-col justify-center py-20 sm:py-12">
          {children}
        </div>

        {/* Footer Area */}
        <div className="relative mt-auto w-full p-4 sm:p-5 z-50 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pointer-events-none">
          <div className="pointer-events-auto">
            <FooterLinks />
          </div>

          <Link
            href="/"
            className="transition-transform hover:scale-101 pointer-events-auto"
          >
            {/* Light Mode Logo */}
            <Image
              src={iconLight}
              alt="CloudburstLab Logo"
              width={288}
              height={64}
              className="w-32 sm:w-40 h-auto object-contain dark:hidden"
              priority
            />
            {/* Dark Mode Logo */}
            <Image
              src={iconDark}
              alt="CloudburstLab Logo"
              width={288}
              height={64}
              className="w-40 sm:w-48 h-auto object-contain hidden dark:block"
              priority
            />
          </Link>
        </div>
      </div>
    </I18nProvider>
  );
}