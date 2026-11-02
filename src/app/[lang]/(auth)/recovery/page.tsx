import { Metadata } from "next";
import { getLocalizedAlternates } from "@/utils/seo";
import ForgotPasswordClient from "./forgot-password-client";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";
import { locales } from "@/lib/i18n/config";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const metadata: Metadata = {
  title: "Account Recovery",
  description: "Recover your account securely via email recovery.",
  alternates: getLocalizedAlternates("/recovery"),
};

export default async function RecoveryPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const signinDict = await getDictionary("signin", locale);

  return <ForgotPasswordClient locale={locale} dict={signinDict} />;
}
