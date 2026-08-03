import { getLocale, getDictionary } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import SignUpForm from "@/app/(auth)/signup/signup-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an Account",
  description: "Join CloudburstLab today. Create your account to get started.",
  alternates: {
    canonical: "/signup",
  },
};

export default async function SignUpPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale, 'signup');

  return (
    <I18nProvider locale={locale} messages={dict}>
      <SignUpForm />
    </I18nProvider>
  );
}

