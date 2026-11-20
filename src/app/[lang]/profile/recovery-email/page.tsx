import { Suspense } from "react";
import { getFullProfile } from "@/actions/profile/get-profile";
import { RecoveryEmailManagementPage } from "@/components/profile/views/recovery-email-management-page";
import { ManagementFormSkeleton } from "@/components/profile/profile-skeletons";
import type { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Recovery Email - clouburstlab",
  description: "Manage your recovery email address.",
};

async function RecoveryEmailContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const [schemaDict, securityDict] = await Promise.all([
    getDictionary("schema_security", locale),
    getDictionary("profile_security", locale),
  ]);

  const profileRes = await getFullProfile();
  const profile = profileRes.success ? profileRes.data : null;
  const recoveryEmailObj = profile?.emails?.find((e) => !e.is_primary);
  const recoveryEmail = recoveryEmailObj ? recoveryEmailObj.address : undefined;
  const isVerified = recoveryEmailObj ? recoveryEmailObj.verified : false;

  return (
    <RecoveryEmailManagementPage
      email={recoveryEmail}
      isVerified={isVerified}
      schemaDict={schemaDict}
      securityDict={securityDict.email}
    />
  );
}

export default async function RecoveryEmailPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <div className="space-y-6 w-full">
      <Suspense fallback={<ManagementFormSkeleton />}>
        <RecoveryEmailContent lang={lang} />
      </Suspense>
    </div>
  );
}
