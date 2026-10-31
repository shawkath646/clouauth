import { PhoneManagementPage } from "@/components/profile/views/phone-management-page";
import type { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Phone Numbers - clouburstlab",
  description: "Manage phone numbers for your account.",
};

export default async function PhonePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const dict = await getDictionary("profile_security", locale);
  const phones: React.ComponentProps<typeof PhoneManagementPage>["phones"] = [];

  return (
    <div className="space-y-6 w-full">
      <PhoneManagementPage phones={phones} dict={dict.phone} />
    </div>
  );
}
