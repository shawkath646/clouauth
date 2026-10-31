import { Suspense } from "react";
import { connection } from "next/server";
import { getFullProfile } from "@/actions/profile/get-profile";
import { AuthenticatorManagementPage } from "@/components/profile/views/authenticator-management-page";
import type { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Authenticator - clouburstlab",
  description: "Manage authenticator app for your account.",
};

async function AuthenticatorDynamicContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const dict = await getDictionary("profile_security", locale);

  await connection();
  const profileRes = await getFullProfile();
  const profile = profileRes.success ? profileRes.data : null;

  const hasTotp = !!profile?.has_totp;
  const deterministicAddedOn = String(
    profile?.user.updated_on || profile?.user.created_on || ""
  );

  const authenticator = hasTotp
    ? { id: "totp", enabled: true, added_on: deterministicAddedOn }
    : null;

  return <AuthenticatorManagementPage authenticator={authenticator} dict={dict.authenticator} />;
}

export default async function AuthenticatorPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <div className="space-y-6 w-full">
      <Suspense
        fallback={
          <div className="h-64 w-full rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
        }
      >
        <AuthenticatorDynamicContent lang={lang} />
      </Suspense>
    </div>
  );
}
