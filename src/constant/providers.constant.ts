import googleIcon from "@/assets/providers/google.svg";
import githubIcon from "@/assets/providers/github.svg";
import microsoftIcon from "@/assets/providers/microsoft.svg";
import linkedinIcon from "@/assets/providers/linkedin.svg";

export const PROVIDERS_NAME = ["google", "github", "microsoft", "linkedin"] as const;

export type PROVIDERS = typeof PROVIDERS_NAME[number];

export const SOCIAL_PROVIDERS = [
  { id: "google", name: "Google", icon: googleIcon, invertDark: false },
  { id: "github", name: "GitHub", icon: githubIcon, invertDark: true },
  { id: "microsoft", name: "Microsoft", icon: microsoftIcon, invertDark: false },
  { id: "linkedin", name: "LinkedIn", icon: linkedinIcon, invertDark: false },
] as const;

export const DRIVE_PROVIDERS = [
  { id: "google_drive", name: "Google Drive" },
  { id: "onedrive", name: "OneDrive" },
  { id: "dropbox", name: "Dropbox" },
] as const;
