import { getLocale, getDictionary } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import SignInForm from "@/app/(auth)/signin/signin-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your CloudburstLab account to access your dashboard.",
  alternates: {
    canonical: "/signin",
  },
};

import { Suspense } from "react";

export default async function SignInPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale, 'signin');

  return (
    <I18nProvider locale={locale} messages={dict}>
      <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]">Loading...</div>}>
        <SignInForm />
      </Suspense>
    </I18nProvider>
  );
}

