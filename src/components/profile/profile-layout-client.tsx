"use client";

import { usePathname } from "next/navigation";
import { ProfileHeader } from "./profile-header";
import { ProfileSidebar, ProfileMobileTabs, type ProfileSection } from "./profile-sidebar";
import { motion } from "framer-motion";
import type { FullProfile } from "@/types/profile.types";
import { ReactNode, useEffect } from "react";
import { useTheme } from "next-themes";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/types/i18n.types";

export interface ProfileLayoutClientProps {
  profile: FullProfile;
  children: ReactNode;
  locale?: Locale;
  navDict: Dictionary<"profile_nav">;
}

export function ProfileLayoutClient({ 
  profile, 
  children,
  locale = defaultLocale,
  navDict,
}: ProfileLayoutClientProps) {
  const { setTheme } = useTheme();

  useEffect(() => {
    // Sync theme with user preferences instead of local storage
    if (profile.preferences?.theme) {
      setTheme(profile.preferences.theme);
    }
  }, [profile.preferences?.theme, setTheme]);

  const pathname = usePathname();
  let activeSection = "profile";
  
  if (pathname) {
    const segments = pathname.split("/").filter(Boolean);
    const profileIndex = segments.indexOf("profile");
    if (profileIndex !== -1 && segments.length > profileIndex + 1) {
      activeSection = segments[profileIndex + 1];
    }
  }

  const validSections = [
    "profile", "security", "devices", "applications", 
    "connected", "notifications", "preferences", "privacy", "danger"
  ];

  // Map sub-routes to parent sections
  if (["password", "two-factor", "passkeys", "phone", "recovery-email", "backup-codes"].includes(activeSection)) {
    activeSection = "security";
  } else if (!validSections.includes(activeSection)) {
    activeSection = "profile";
  }

  const typedSection = activeSection as ProfileSection;
  const layoutTitle = navDict.layout.title;

  return (
    <main className="max-w-7xl mx-auto py-4 sm:py-8">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Sidebar for Desktop */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-28">
            <h2 className="text-xl font-bold mb-6 px-3">{layoutTitle}</h2>
            <ProfileSidebar 
              activeSection={typedSection} 
              locale={locale}
              navDict={navDict}
            />
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="flex-1 min-w-0">
          {/* Mobile Header & Tabs */}
          <div className="lg:hidden mb-8">
            <h2 className="text-2xl font-bold mb-6">{layoutTitle}</h2>
            <ProfileMobileTabs 
              activeSection={typedSection} 
              locale={locale}
              navDict={navDict}
            />
          </div>

          <ProfileHeader profile={profile} />
          
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </section>
      </div>
    </main>
  );
}
