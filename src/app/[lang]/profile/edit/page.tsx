import { Suspense } from "react";
import { connection } from "next/server";
import { getExtendedProfile } from "@/actions/profile/get-profile";
import { EditNameForm } from "@/components/profile/edit/edit-name-form";
import { EditUsernameForm } from "@/components/profile/edit/edit-username-form";
import { EditBioForm } from "@/components/profile/edit/edit-bio-form";
import { EditAddressForm } from "@/components/profile/edit/edit-address-form";
import { EditAvatarForm } from "@/components/profile/edit/edit-avatar-form";
import { EditPronounsForm } from "@/components/profile/edit/edit-pronouns-form";
import { redirect, notFound } from "next/navigation";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

interface ProfileEditPageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ field?: string | string[] }>;
}

async function ProfileEditDynamicContent({
  params,
  searchParams,
}: ProfileEditPageProps) {
  const { lang } = await params;
  const locale = resolveLocale(lang);

  const [schemaDict, personalDict] = await Promise.all([
    getDictionary("schema_profile", locale),
    getDictionary("profile_personal", locale),
  ]);

  await connection();
  const [res, resolvedParams] = await Promise.all([
    getExtendedProfile(),
    searchParams,
  ]);

  if (!res.success || !res.data) {
    redirect(`/${locale}/signin`);
  }

  const fieldRaw = resolvedParams.field;
  const field = Array.isArray(fieldRaw) ? fieldRaw[0] : fieldRaw;

  switch (field) {
    case "name":
      return (
        <EditNameForm
          initialData={res.data}
          locale={locale}
          schemaDict={schemaDict}
          personalDict={personalDict.editName}
        />
      );
    case "username":
      return (
        <EditUsernameForm
          initialData={res.data}
          locale={locale}
          schemaDict={schemaDict}
          personalDict={personalDict.editUsername}
        />
      );
    case "bio":
      return (
        <EditBioForm
          initialData={res.data}
          locale={locale}
          schemaDict={schemaDict}
          personalDict={personalDict.editBio}
        />
      );
    case "address":
      return (
        <EditAddressForm
          initialData={res.data}
          locale={locale}
          schemaDict={schemaDict}
          personalDict={personalDict.editAddress}
        />
      );
    case "avatar":
      return <EditAvatarForm locale={locale} />;
    case "pronouns":
      return (
        <EditPronounsForm
          initialData={res.data}
          locale={locale}
          schemaDict={schemaDict}
          personalDict={personalDict.editPronouns}
        />
      );
    default:
      notFound();
  }
}

export default function ProfileEditPage({
  params,
  searchParams,
}: ProfileEditPageProps) {
  return (
    <div className="space-y-6 w-full">
      <main className="w-full rounded-2xl p-6 sm:p-8 bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-border/50 shadow-sm">
        <Suspense
          fallback={
            <div className="h-72 w-full rounded-xl bg-muted/20 animate-pulse" />
          }
        >
          <ProfileEditDynamicContent params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
