import { getExtendedProfile } from "@/actions/profile/get-profile.actions";
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

export default async function ProfileEditPage({ searchParams }: ProfileEditPageProps) {
  const res = await getExtendedProfile();

  if (!res.success || !res.data) {
    redirect("/signin");
  }

  const fieldRaw = (await searchParams).field;
  const field = Array.isArray(fieldRaw) ? fieldRaw[0] : fieldRaw;

  let formContent;

  switch (field) {
    case "name":
      formContent = <EditNameForm initialData={res.data} />;
      break;
    case "username":
      formContent = <EditUsernameForm initialData={res.data} />;
      break;
    case "bio":
      formContent = <EditBioForm initialData={res.data} />;
      break;
    case "address":
      formContent = <EditAddressForm initialData={res.data} />;
      break;
    case "avatar":
      formContent = <EditAvatarForm />;
      break;
    case "pronouns":
      formContent = <EditPronounsForm initialData={res.data} />;
      break;
    default:
      notFound();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <main className="w-full rounded-2xl p-6 sm:p-8 bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-border/50 shadow-sm">
        {formContent}
      </main>
    </div>
  );
}
