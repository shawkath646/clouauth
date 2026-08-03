"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProfileHeader } from "./profile-header";
import { ProfileSidebar, ProfileMobileTabs, ProfileSection } from "./profile-sidebar";
import { PersonalInfoSection } from "./personal-info-section";
import { SecuritySection } from "./security-section";
import { DevicesSection } from "./devices-section";
import { ConnectedAccountsSection } from "./connected-accounts-section";
import { NotificationsSection } from "./notifications-section";
import { PreferencesSection } from "./preferences-section";
import { PrivacySection } from "./privacy-section";
import { DangerZoneSection } from "./danger-zone-section";
import { motion, AnimatePresence } from "framer-motion";
import type { FullProfile } from "@/types/profile.types";

function ProfileShellContent({ profile }: { profile: FullProfile }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as ProfileSection | null;
  const activeSection = tabParam || "profile";

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return <PersonalInfoSection profile={profile} />;
      case "security":
        return <SecuritySection profile={profile} />;
      case "devices":
        return <DevicesSection profile={profile} />;
      case "connected":
        return <ConnectedAccountsSection profile={profile} />;
      case "notifications":
        return <NotificationsSection profile={profile} />;
      case "preferences":
        return <PreferencesSection profile={profile} />;
      case "privacy":
        return <PrivacySection profile={profile} />;
      case "danger":
        return <DangerZoneSection profile={profile} />;
      default:
        return <PersonalInfoSection profile={profile} />;
    }
  };

  return (
    <main className="max-w-7xl mx-auto py-4 sm:py-8">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Sidebar for Desktop */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-28">
            <h2 className="text-xl font-bold mb-6 px-3">Account Settings</h2>
            <ProfileSidebar 
              activeSection={activeSection} 
            />
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="flex-1 min-w-0">
          {/* Mobile Header & Tabs */}
          <div className="lg:hidden mb-8">
            <h2 className="text-2xl font-bold mb-6">Account Settings</h2>
            <ProfileMobileTabs 
              activeSection={activeSection} 
            />
          </div>

          <ProfileHeader profile={profile} />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}

export function ProfileShell({ profile }: { profile: FullProfile }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <ProfileShellContent profile={profile} />
    </Suspense>
  );
}
