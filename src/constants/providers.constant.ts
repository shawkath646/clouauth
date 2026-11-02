import googleIcon from "@/assets/providers/google.svg";
import githubIcon from "@/assets/providers/github.svg";
import microsoftIcon from "@/assets/providers/microsoft.svg";
import linkedinIcon from "@/assets/providers/linkedin.svg";

export const PROVIDERS_NAME = ["google", "github", "microsoft", "linkedin"] as const;

export type PROVIDERS = typeof PROVIDERS_NAME[number];

export const SOCIAL_PROVIDERS = [
  { id: "google", name: "Google", icon: googleIcon, invertDark: false, disabled: false },
  { id: "github", name: "GitHub", icon: githubIcon, invertDark: true, disabled: false },
  { id: "microsoft", name: "Microsoft", icon: microsoftIcon, invertDark: false, disabled: false },
  { id: "linkedin", name: "LinkedIn", icon: linkedinIcon, invertDark: false, disabled: true },
] as const;

export const DRIVE_PROVIDERS = [
  { id: "google_drive", name: "Google Drive", disabled: false },
  { id: "onedrive", name: "OneDrive", disabled: false },
  { id: "dropbox", name: "Dropbox", disabled: true },
] as const;
