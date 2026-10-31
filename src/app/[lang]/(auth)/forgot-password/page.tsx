import { Metadata } from "next";
import { getLocalizedAlternates } from "@/utils/seo";
import ForgotPasswordClient from "./forgot-password-client";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";
import { locales } from "@/lib/i18n/config";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your clouburstlab account password securely via email recovery.",
  alternates: getLocalizedAlternates("/forgot-password"),
  openGraph: {
    title: "Reset Password — clouburstlab",
    description: "Reset your clouburstlab account password securely.",
    url: "/forgot-password",
  },
};

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const signinDict = await getDictionary("signin", locale);

  return <ForgotPasswordClient locale={locale} dict={signinDict} />;
}
