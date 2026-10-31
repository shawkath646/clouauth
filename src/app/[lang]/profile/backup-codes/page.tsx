import { Suspense } from "react";
import { connection } from "next/server";
import { getFullProfile } from "@/actions/profile/get-profile";
import { BackupCodesManagementPage } from "@/components/profile/views/backup-codes-management-page";
import { requireSudoPage } from "@/actions/auth/sudo";
import type { Metadata } from "next";
import { resolveLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Backup Codes - clouburstlab",
  description: "Manage your account backup codes.",
};

async function BackupCodesContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  await connection();
  await requireSudoPage(`/${locale}/profile/backup-codes`, locale);
  const profileRes = await getFullProfile();
  const profile = profileRes.success ? profileRes.data : null;

  const hasCodes = Boolean(
    profile?.recovery_codes && profile.recovery_codes.length > 0
  );

  return <BackupCodesManagementPage hasCodes={hasCodes} />;
}

export default async function BackupCodesPage({
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
        <BackupCodesContent lang={lang} />
      </Suspense>
    </div>
  );
}
