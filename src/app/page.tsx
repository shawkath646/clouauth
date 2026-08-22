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
import { getMinimalProfile } from "@/actions/profile/get-profile.actions";
import JsonLd from "@/components/json-ld";
import { getServerTranslations, getDictionary } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";

export default async function Home() {
  const BASE_URL = getEnv("NEXT_PUBLIC_BASE_URL");
  
  const [profileResult, { locale }] = await Promise.all([
    getMinimalProfile(),
    getServerTranslations("landing")
  ]);
  
  const profile = profileResult.success && profileResult.data ? profileResult.data : null;
  const isLoggedIn = !!profile;
  const dict = await getDictionary(locale, "landing");

  return (
    <I18nProvider locale={locale} messages={dict}>
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
          releaseNotes: "Initial release of the clouburstlab identity platform.",
        }}
      />
      <Navigation />
      <main className="flex-1 w-full max-w-[100vw] overflow-x-hidden pt-16">
        <Hero profile={profile} />
        <TrustSection />
        <FeatureGrid />
        <DeveloperSection />
        <SecuritySection />
        <FutureVision />
        <CallToAction isLoggedIn={isLoggedIn} />
      </main>
      <Footer />
    </div>
    </I18nProvider>
  );
}
