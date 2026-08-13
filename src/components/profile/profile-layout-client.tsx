"use client";

import { usePathname } from "next/navigation";
import { ProfileHeader } from "./profile-header";
import { ProfileSidebar, ProfileMobileTabs, type ProfileSection } from "./profile-sidebar";
import { motion } from "framer-motion";
import type { FullProfile } from "@/types/profile.types";
import { ReactNode, useEffect } from "react";
import { useTranslations } from "@/lib/i18n/hooks";
import { useTheme } from "next-themes";

export function ProfileLayoutClient({ 
  profile, 
  children 
}: { 
  profile: FullProfile, 
  children: ReactNode 
}) {
  const { t } = useTranslations();

  const { setTheme } = useTheme();

  useEffect(() => {
    // Sync theme with user preferences instead of local storage
    if (profile.preferences?.theme) {
      setTheme(profile.preferences.theme);
    }
  }, [profile.preferences?.theme, setTheme]);
  const pathname = usePathname();
  let activeSection = "profile";
  const parts = pathname.split("/");
  
  if (parts.length >= 3) {
    activeSection = parts[2];
  } else if (parts.length === 2 && parts[1] === "profile") {
    activeSection = "profile";
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

  // Cast to specific type for components
  const typedSection = activeSection as ProfileSection;

  return (
    <main className="max-w-7xl mx-auto py-4 sm:py-8">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Sidebar for Desktop */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-28">
            <h2 className="text-xl font-bold mb-6 px-3">{t("layout.title")}</h2>
            <ProfileSidebar 
              activeSection={typedSection} 
            />
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="flex-1 min-w-0">
          {/* Mobile Header & Tabs */}
          <div className="lg:hidden mb-8">
            <h2 className="text-2xl font-bold mb-6">{t("layout.title")}</h2>
            <ProfileMobileTabs 
              activeSection={typedSection} 
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
