import { Suspense } from "react";
import { getEnv } from "@/utils/env";
import { Navigation } from "@/components/landing/navigation";
import { Hero } from "@/components/landing/hero";
import { TrustSection } from "@/components/landing/trust-section";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { DeveloperSection } from "@/components/landing/developer-section";
import { SecuritySection } from "@/components/landing/security-section";
import { FutureVision } from "@/components/landing/future-vision";
import { CallToAction } from "@/components/landing/call-to-action";
import { Footer } from "@/components/landing/footer";
import { getMinimalProfile } from "@/actions/profile/get-profile";
import JsonLd from "@/components/json-ld";
import { getServerTranslations, getDictionary } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";

/**
 * Dynamic streaming component for personalized Hero section under Partial Prerendering.
 */
async function DynamicHero() {
  const profileResult = await getMinimalProfile();
  const profile =
    profileResult.success && profileResult.data ? profileResult.data : null;
  return <Hero profile={profile} />;
}

/**
 * Dynamic streaming component for personalized CallToAction section under Partial Prerendering.
 */
async function DynamicCallToAction() {
  const profileResult = await getMinimalProfile();
  const isLoggedIn = Boolean(profileResult.success && profileResult.data);
  return <CallToAction isLoggedIn={isLoggedIn} />;
}

/**
 * Dynamic localized content boundary that reads proxy-forwarded locale headers/cookies
 * inside `<Suspense>` while keeping the outer page shell and JSON-LD 100% static.
 */
async function LandingLocalizedContent() {
  const { locale } = await getServerTranslations("landing");
  const dict = await getDictionary(locale, "landing");

  return (
    <I18nProvider locale={locale} messages={dict}>
      <Navigation />
      <main className="flex-1 w-full max-w-[100vw] overflow-x-hidden pt-16">
        <Suspense fallback={<Hero profile={null} />}>
          <DynamicHero />
        </Suspense>
        <TrustSection />
        <FeatureGrid />
        <DeveloperSection />
        <SecuritySection />
        <FutureVision />
        <Suspense fallback={<CallToAction isLoggedIn={false} />}>
          <DynamicCallToAction />
        </Suspense>
      </main>
      <Footer />
    </I18nProvider>
  );
}

export default function Home() {
  const BASE_URL = getEnv("NEXT_PUBLIC_BASE_URL");

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
          url: BASE_URL,
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
      <Suspense
        fallback={
          <div className="min-h-screen flex flex-col bg-background">
            <div className="h-16 border-b border-border/40 bg-background/80 backdrop-blur-md" />
            <div className="flex-1 w-full max-w-7xl mx-auto px-4 pt-24 pb-16 animate-pulse">
              <div className="h-12 w-2/3 max-w-xl bg-muted/40 rounded-2xl mx-auto mb-6" />
              <div className="h-6 w-1/2 max-w-md bg-muted/30 rounded-xl mx-auto" />
            </div>
          </div>
        }
      >
        <LandingLocalizedContent />
      </Suspense>
    </div>
  );
}
