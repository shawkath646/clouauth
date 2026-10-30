import { Suspense } from "react";
import { getExtendedProfile } from "@/actions/profile/get-profile";
import { EditNameForm } from "@/components/profile/edit/edit-name-form";
import { EditUsernameForm } from "@/components/profile/edit/edit-username-form";
import { EditBioForm } from "@/components/profile/edit/edit-bio-form";
import { EditAddressForm } from "@/components/profile/edit/edit-address-form";
import { EditAvatarForm } from "@/components/profile/edit/edit-avatar-form";
import { EditPronounsForm } from "@/components/profile/edit/edit-pronouns-form";
import { redirect, notFound } from "next/navigation";

interface ProfileEditPageProps {
  searchParams: Promise<{ field?: string | string[] }>;
}

export const instant = false;

async function ProfileEditDynamicContent({
  searchParams,
}: ProfileEditPageProps) {
  const [res, resolvedParams] = await Promise.all([
    getExtendedProfile(),
    searchParams,
  ]);

  if (!res.success || !res.data) {
    redirect("/signin");
  }

  const fieldRaw = resolvedParams.field;
  const field = Array.isArray(fieldRaw) ? fieldRaw[0] : fieldRaw;

  switch (field) {
    case "name":
      return <EditNameForm initialData={res.data} />;
    case "username":
      return <EditUsernameForm initialData={res.data} />;
    case "bio":
      return <EditBioForm initialData={res.data} />;
    case "address":
      return <EditAddressForm initialData={res.data} />;
    case "avatar":
      return <EditAvatarForm />;
    case "pronouns":
      return <EditPronounsForm initialData={res.data} />;
    default:
      notFound();
  }
}

export default function ProfileEditPage({
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
          <ProfileEditDynamicContent searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
