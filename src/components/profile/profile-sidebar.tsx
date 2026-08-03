import Link from "next/link";
import { cn } from "@/misc/utils";
import { Separator } from "@/components/ui/separator";
import {
  UserCircle,
  Shield,
  MonitorSmartphone,
  Link2,
  Bell,
  Palette,
  FileText,
  AlertTriangle,
} from "lucide-react";

export type ProfileSection =
  | "profile"
  | "security"
  | "devices"
  | "connected"
  | "notifications"
  | "preferences"
  | "privacy"
  | "danger";

interface NavItem {
  id: ProfileSection;
  label: string;
  icon: React.ElementType;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "profile", label: "Personal Info", icon: UserCircle, group: "Account" },
  { id: "security", label: "Security", icon: Shield, group: "Account" },
  { id: "devices", label: "Devices", icon: MonitorSmartphone, group: "Access" },
  { id: "connected", label: "Connected Accounts", icon: Link2, group: "Access" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "Preferences" },
  { id: "preferences", label: "Preferences", icon: Palette, group: "Preferences" },
  { id: "privacy", label: "Privacy & Data", icon: FileText, group: "Data" },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle, group: "Data" },
];

interface ProfileSidebarProps {
  activeSection: ProfileSection;
  className?: string;
}

export function ProfileSidebar({
  activeSection,
  className,
}: ProfileSidebarProps) {
  return (
    <div className={cn("h-full", className)}>
      <nav className="flex flex-col gap-1.5 p-2" role="navigation" aria-label="Profile settings">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const isDanger = item.id === "danger";

          return (
            <Link
              key={item.id}
              href={`/profile?tab=${item.id}`}
              scroll={false}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all outline-none relative",
                "hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50",
                isActive && !isDanger &&
                  "bg-primary/10 text-primary border border-primary/20",
                isActive && isDanger &&
                  "bg-destructive/10 text-destructive border border-destructive/20",
                !isActive && !isDanger &&
                  "text-muted-foreground hover:text-foreground",
                !isActive && isDanger &&
                  "text-muted-foreground hover:text-destructive"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Horizontal mobile tabs variant */
export function ProfileMobileTabs({
  activeSection,
}: ProfileSidebarProps) {
  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" role="tablist" aria-label="Profile sections">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;
        const isDanger = item.id === "danger";

        return (
          <Link
            key={item.id}
            href={`/profile?tab=${item.id}`}
            scroll={false}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all outline-none whitespace-nowrap",
              "focus-visible:ring-2 focus-visible:ring-ring/50",
              isActive && !isDanger &&
                "bg-primary/10 text-primary border border-primary/20",
              isActive && isDanger &&
                "bg-destructive/10 text-destructive border border-destructive/20",
              !isActive &&
                "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export { NAV_ITEMS };
