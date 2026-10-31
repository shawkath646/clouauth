import { connection } from "next/server";
import { Suspense } from "react";
import { getEnv } from "@/utils/utils";
import { Navigation } from "@/components/landing/navigation";
import { Hero } from "@/components/landing/hero";
import { TrustSection } from "@/components/landing/trust-section";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { DeveloperSection } from "@/components/landing/developer-section";
import { SecuritySection } from "@/components/landing/security-section";
import { FutureVision } from "@/components/landing/future-vision";
import { CallToAction } from "@/components/landing/call-to-action";
import { Footer } from "@/components/layout/footer";
import { getMinimalProfile } from "@/actions/profile/get-profile";
import JsonLd from "@/components/json-ld";
import { getDictionary, resolveLocale } from "@/lib/i18n/server";
import { locales, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/types/i18n.types";

const BASE_URL = getEnv("NEXT_PUBLIC_BASE_URL");

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

/**
 * Dynamic streaming component for personalized Hero section under Partial Prerendering.
 */
async function DynamicHero({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary<"landing">["hero"];
}) {
  await connection();
  const profileResult = await getMinimalProfile();
  const profile =
    profileResult.success && profileResult.data ? profileResult.data : null;
  return <Hero profile={profile} locale={locale} dict={dict} />;
}

/**
 * Dynamic streaming component for personalized CallToAction section under Partial Prerendering.
 */
async function DynamicCallToAction({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary<"landing">["callToAction"];
}) {
  await connection();
  const profileResult = await getMinimalProfile();
  const isLoggedIn = Boolean(profileResult.success && profileResult.data);
  return <CallToAction isLoggedIn={isLoggedIn} locale={locale} dict={dict} />;
}

interface HomePageProps {
  params: Promise<{ lang: string }>;
}

export default async function Home({ params }: HomePageProps) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const [dict, commonDict] = await Promise.all([
    getDictionary("landing", locale),
    getDictionary("common", locale),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "@id": `${BASE_URL}/#application`,
          name: "ClouAuth",
          description:
            "A centralized authentication and user management system for clouburstlab ecosystem that serves as a fully compliant " +
            "OIDC 2.0 and OAuth 2.0 Identity Provider (IdP). Features include passkey-based " +
            "passwordless login, two-factor authentication (2FA), social login (Google, GitHub, Microsoft), " +
            "developer OAuth application management, and account security controls.",
          url: `${BASE_URL}/${locale}`,
          applicationCategory: "SecurityApplication",
          applicationSubCategory: "Identity Provider",
          operatingSystem: "Web",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
          },
          author: {
            "@type": "Person",
            name: "Shawkat Hossain Maruf",
            url: "https://shawkath646.dev",
          },
          provider: {
            "@id": `${BASE_URL}/#organization`,
          },
          featureList: [
            "OIDC 2.0 / OpenID Connect compliant Identity Provider",
            "OAuth 2.0 Authorization Code Flow with PKCE",
            "Passkey / WebAuthn passwordless authentication",
            "Two-Factor Authentication (2FA) — TOTP, Email, SMS",
            "Social login — Google, GitHub, Microsoft",
            "Developer OAuth application management with client credentials",
            "Session management with refresh token rotation and replay detection",
            "Backup/recovery codes",
            "Account security controls — lockout, disable, connected devices",
            "Internationalization (i18n) support",
          ],
          screenshot: {
            "@type": "ImageObject",
            url: `${BASE_URL}/opengraph-image.png`,
            caption: "ClouAuth — sign-in screen",
          },
          softwareVersion: "0.1.0",
          releaseNotes:
            "Initial release of the clouburstlab identity platform.",
        }}
      />

      <Navigation locale={locale} dict={dict.navigation} />
      <main className="flex-1 w-full max-w-[100vw] overflow-x-hidden pt-16">
        <Suspense fallback={<Hero profile={null} locale={locale} dict={dict.hero} />}>
          <DynamicHero locale={locale} dict={dict.hero} />
        </Suspense>
        <TrustSection dict={dict.trustSection} />
        <FeatureGrid dict={dict.featureGrid} />
        <DeveloperSection locale={locale} dict={dict.developerSection} />
        <SecuritySection dict={dict.securitySection} />
        <FutureVision dict={dict.futureVision} />
        <Suspense fallback={<CallToAction isLoggedIn={false} locale={locale} dict={dict.callToAction} />}>
          <DynamicCallToAction locale={locale} dict={dict.callToAction} />
        </Suspense>
      </main>
      <Footer locale={locale} dict={dict.footer} commonDict={commonDict} />
    </div>
  );
}
