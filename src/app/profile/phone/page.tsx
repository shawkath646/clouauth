import { PhoneManagementPage } from "@/components/profile/views/phone-management-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Phone Numbers - clouburstlab",
  description: "Manage phone numbers for your account.",
};

export default async function PhonePage() {
  const phones: React.ComponentProps<typeof PhoneManagementPage>["phones"] = [];

  return (
    <div className="space-y-6 max-w-3xl">
      <PhoneManagementPage phones={phones} />
    </div>
  );
}
