import { Suspense } from "react";
import { getFullProfile } from "@/actions/profile/get-profile";
import { PasswordManagementPage } from "@/components/profile/views/password-management-page";
import { ManagementFormSkeleton } from "@/components/profile/profile-skeletons";
import { requireSudoPage } from "@/actions/auth/sudo";
import type { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Password - clouburstlab",
  description: "Manage your account password.",
};

async function PasswordContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const [schemaDict, securityDict] = await Promise.all([
    getDictionary("schema_security", locale),
    getDictionary("profile_security", locale),
  ]);

  await requireSudoPage(`/${locale}/profile/password`, locale);
  const profileRes = await getFullProfile();
  const profile = profileRes.success ? profileRes.data : null;

  const hasPassword = Boolean(profile?.password);
  const lastChangedOn = profile?.password?.last_changed_on
    ? String(profile.password.last_changed_on).split("T")[0]
    : undefined;

  return (
    <PasswordManagementPage
      hasPassword={hasPassword}
      lastChangedOn={lastChangedOn}
      schemaDict={schemaDict}
      securityDict={securityDict.password}
    />
  );
}

export default async function PasswordPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <div className="space-y-6 w-full">
      <Suspense fallback={<ManagementFormSkeleton />}>
        <PasswordContent lang={lang} />
      </Suspense>
    </div>
  );
}
