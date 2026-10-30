import { Metadata } from "next";
import { getLocalizedAlternates } from "@/utils/seo";
import ForgotPasswordClient from "./forgot-password-client";

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


export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
