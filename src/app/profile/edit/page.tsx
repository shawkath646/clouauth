import { getExtendedProfile } from "@/actions/profile/get-profile";
import { EditNameForm } from "./components/edit-name-form";
import { EditUsernameForm } from "./components/edit-username-form";
import { EditBioForm } from "./components/edit-bio-form";
import { EditAddressForm } from "./components/edit-address-form";
import { EditAvatarForm } from "./components/edit-avatar-form";
import { EditPronounsForm } from "./components/edit-pronouns-form";
import { redirect, notFound } from "next/navigation";

export default async function ProfileEditPage({ searchParams }: PageProps<'/profile/edit'>) {
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
    <main className="max-w-4xl mx-auto w-full rounded-2xl p-6 sm:p-8 bg-background/70 dark:bg-card/80 backdrop-blur-xl">
      {formContent}
    </main>
  );
}
