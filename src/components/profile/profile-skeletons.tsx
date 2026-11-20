import { cn } from "@/utils/utils";
import { Separator } from "@/components/ui/separator";

export function SkeletonBox({ className }: { className?: string }) {
  return <div className={cn("bg-muted/30 rounded-lg animate-pulse", className)} />;
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 px-5 py-4 sm:px-6 sm:py-4 mb-6 sm:mb-8 bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-primary/10 dark:border-primary/10 rounded-xl animate-pulse">
      <div className="w-20 h-20 rounded-full bg-muted/40 shrink-0 border-2 border-background/50" />
      <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 mb-1.5">
          <div className="h-7 w-44 bg-muted/40 rounded-lg" />
          <div className="h-5 w-20 bg-primary/10 rounded-full" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-28 bg-muted/30 rounded" />
          <span className="text-muted-foreground opacity-30">•</span>
          <div className="h-4 w-36 bg-muted/30 rounded" />
        </div>
        <div className="h-3 w-32 bg-muted/20 rounded mt-1" />
      </div>
    </div>
  );
}

export function ProfileSidebarSkeleton() {
  const groups = [
    { name: "Account", count: 2 },
    { name: "Access", count: 3 },
    { name: "Preferences", count: 2 },
    { name: "Data", count: 2 },
  ];

  return (
    <div className="space-y-6 animate-pulse">
      {groups.map((group, idx) => (
        <div key={idx} className="space-y-2">
          <div className="h-3.5 w-20 bg-muted/30 rounded px-3 mb-2" />
          <div className="space-y-1">
            {Array.from({ length: group.count }).map((_, itemIdx) => (
              <div
                key={itemIdx}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card/20 border border-transparent"
              >
                <div className="w-4 h-4 rounded bg-muted/30 shrink-0" />
                <div className="h-4 w-28 bg-muted/30 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SectionCardSkeleton({
  titleWidth = "w-40",
  descWidth = "w-64",
  rowCount = 4,
}: {
  titleWidth?: string;
  descWidth?: string;
  rowCount?: number;
}) {
  return (
    <div className="flex flex-col bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-primary/10 rounded-xl overflow-hidden animate-pulse">
      <div className="px-5 py-5 sm:px-6 sm:py-5 border-b border-primary/5">
        <div className={cn("h-6 bg-muted/40 rounded-md mb-2", titleWidth)} />
        <div className={cn("h-4 bg-muted/25 rounded-md", descWidth)} />
      </div>
      <div>
        {Array.from({ length: rowCount }).map((_, idx) => (
          <div key={idx}>
            <div className="w-full flex items-center justify-between px-5 py-4 sm:px-6 gap-4">
              <div className="h-4 w-28 bg-muted/30 rounded" />
              <div className="flex items-center gap-3">
                <div className="h-4 w-36 bg-muted/20 rounded" />
                <div className="w-4 h-4 rounded bg-muted/20 shrink-0" />
              </div>
            </div>
            {idx < rowCount - 1 && <Separator className="opacity-40" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PersonalInfoSkeleton() {
  return (
    <div className="space-y-6">
      {/* Basic Info Card */}
      <div className="flex flex-col bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-primary/10 rounded-xl overflow-hidden animate-pulse">
        <div className="px-5 py-5 sm:px-6 sm:py-5 border-b border-primary/5">
          <div className="h-6 w-36 bg-muted/40 rounded-md mb-2" />
          <div className="h-4 w-60 bg-muted/25 rounded-md" />
        </div>
        <div>
          {/* Avatar Row */}
          <div className="w-full flex items-center justify-between px-5 py-4 sm:px-6 gap-4">
            <div className="h-4 w-28 bg-muted/30 rounded" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted/40 shrink-0" />
              <div className="w-4 h-4 rounded bg-muted/20 shrink-0" />
            </div>
          </div>
          <Separator className="opacity-40" />

          {/* Name Row */}
          <div className="w-full flex items-center justify-between px-5 py-4 sm:px-6 gap-4">
            <div className="h-4 w-20 bg-muted/30 rounded" />
            <div className="flex items-center gap-3">
              <div className="h-4 w-36 bg-muted/25 rounded" />
              <div className="w-4 h-4 rounded bg-muted/20 shrink-0" />
            </div>
          </div>
          <Separator className="opacity-40" />

          {/* Username Row */}
          <div className="w-full flex items-center justify-between px-5 py-4 sm:px-6 gap-4">
            <div className="h-4 w-24 bg-muted/30 rounded" />
            <div className="flex items-center gap-3">
              <div className="h-4 w-28 bg-muted/25 rounded" />
              <div className="w-4 h-4 rounded bg-muted/20 shrink-0" />
            </div>
          </div>
          <Separator className="opacity-40" />

          {/* Bio Row */}
          <div className="w-full flex items-center justify-between px-5 py-4 sm:px-6 gap-4">
            <div className="h-4 w-16 bg-muted/30 rounded" />
            <div className="flex items-center gap-3">
              <div className="h-4 w-48 bg-muted/20 rounded" />
              <div className="w-4 h-4 rounded bg-muted/20 shrink-0" />
            </div>
          </div>
          <Separator className="opacity-40" />

          {/* Pronouns Row */}
          <div className="w-full flex items-center justify-between px-5 py-4 sm:px-6 gap-4">
            <div className="h-4 w-20 bg-muted/30 rounded" />
            <div className="flex items-center gap-3">
              <div className="h-4 w-20 bg-muted/20 rounded" />
              <div className="w-4 h-4 rounded bg-muted/20 shrink-0" />
            </div>
          </div>
          <Separator className="opacity-40" />

          {/* Joined Date Row */}
          <div className="w-full flex items-center justify-between px-5 py-4 sm:px-6 gap-4">
            <div className="h-4 w-24 bg-muted/30 rounded" />
            <div className="h-4 w-32 bg-muted/25 rounded" />
          </div>
        </div>
      </div>

      {/* Contact & Address Card */}
      <SectionCardSkeleton titleWidth="w-44" descWidth="w-72" rowCount={4} />
    </div>
  );
}

export function SecuritySectionSkeleton() {
  return (
    <div className="space-y-6">
      {/* Sign-in Security Card */}
      <SectionCardSkeleton titleWidth="w-40" descWidth="w-64" rowCount={3} />
      {/* Account Recovery Card */}
      <SectionCardSkeleton titleWidth="w-48" descWidth="w-72" rowCount={3} />
      {/* Recent Security Activity Card */}
      <div className="flex flex-col bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-primary/10 rounded-xl overflow-hidden animate-pulse">
        <div className="px-5 py-5 sm:px-6 sm:py-5 border-b border-primary/5">
          <div className="h-6 w-52 bg-muted/40 rounded-md mb-2" />
          <div className="h-4 w-72 bg-muted/25 rounded-md" />
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted/30 shrink-0" />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="h-4 w-40 bg-muted/30 rounded" />
                <div className="h-3 w-56 bg-muted/20 rounded" />
              </div>
              <div className="h-3 w-20 bg-muted/20 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ConnectedAccountsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Social Providers */}
      <div className="flex flex-col bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-primary/10 rounded-xl overflow-hidden animate-pulse">
        <div className="px-5 py-5 sm:px-6 sm:py-5 border-b border-primary/5">
          <div className="h-6 w-44 bg-muted/40 rounded-md mb-2" />
          <div className="h-4 w-80 bg-muted/25 rounded-md" />
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-primary/5 bg-card/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted/30" />
                <div className="space-y-1">
                  <div className="h-4 w-28 bg-muted/30 rounded" />
                  <div className="h-3 w-20 bg-muted/20 rounded" />
                </div>
              </div>
              <div className="h-9 w-24 rounded-lg bg-muted/30" />
            </div>
          ))}
        </div>
      </div>

      {/* Cloud Drives */}
      <div className="flex flex-col bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-primary/10 rounded-xl overflow-hidden animate-pulse">
        <div className="px-5 py-5 sm:px-6 sm:py-5 border-b border-primary/5">
          <div className="h-6 w-40 bg-muted/40 rounded-md mb-2" />
          <div className="h-4 w-72 bg-muted/25 rounded-md" />
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-primary/5 bg-card/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted/30" />
                <div className="space-y-1">
                  <div className="h-4 w-28 bg-muted/30 rounded" />
                  <div className="h-3 w-20 bg-muted/20 rounded" />
                </div>
              </div>
              <div className="h-9 w-24 rounded-lg bg-muted/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ApplicationsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Connected Apps Card */}
      <div className="flex flex-col bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-primary/10 rounded-xl overflow-hidden">
        <div className="px-5 py-5 sm:px-6 sm:py-5 border-b border-primary/5">
          <div className="h-6 w-48 bg-muted/40 rounded-md mb-2" />
          <div className="h-4 w-80 bg-muted/25 rounded-md" />
        </div>
        <div className="p-5 sm:p-6">
          <div className="h-20 w-full rounded-xl bg-card/30 border border-primary/5 flex items-center px-4 gap-4">
            <div className="w-12 h-12 rounded-xl bg-muted/30 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-muted/30 rounded" />
              <div className="h-3 w-64 bg-muted/20 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Developer Apps Card */}
      <div className="flex flex-col bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-primary/10 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-5 sm:px-6 sm:py-5 border-b border-primary/5">
          <div>
            <div className="h-6 w-52 bg-muted/40 rounded-md mb-2" />
            <div className="h-4 w-72 bg-muted/25 rounded-md" />
          </div>
          <div className="h-9 w-32 rounded-xl bg-primary/20" />
        </div>
        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-primary/10 bg-card/30 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted/30" />
                <div className="space-y-1 flex-1">
                  <div className="h-4 w-32 bg-muted/30 rounded" />
                  <div className="h-3 w-20 bg-muted/20 rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-muted/20 rounded" />
              <div className="h-8 w-24 rounded-lg bg-muted/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DevicesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-primary/10 rounded-xl overflow-hidden">
        <div className="px-5 py-5 sm:px-6 sm:py-5 border-b border-primary/5">
          <div className="h-6 w-36 bg-muted/40 rounded-md mb-2" />
          <div className="h-4 w-64 bg-muted/25 rounded-md" />
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-primary/5 bg-card/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted/30" />
                <div className="space-y-1">
                  <div className="h-4 w-36 bg-muted/30 rounded" />
                  <div className="h-3 w-48 bg-muted/20 rounded" />
                </div>
              </div>
              <div className="h-7 w-20 rounded-full bg-muted/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PreferencesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <SectionCardSkeleton titleWidth="w-32" descWidth="w-60" rowCount={3} />
    </div>
  );
}

export function PrivacySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <SectionCardSkeleton titleWidth="w-36" descWidth="w-64" rowCount={2} />
      <div className="flex flex-col bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-primary/10 rounded-xl p-5 sm:p-6 space-y-3">
        <div className="h-5 w-40 bg-muted/40 rounded" />
        <div className="h-4 w-72 bg-muted/25 rounded" />
        <div className="h-9 w-32 rounded-xl bg-muted/30 mt-2" />
      </div>
    </div>
  );
}

export function DangerZoneSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-destructive/20 rounded-xl overflow-hidden">
        <div className="px-5 py-5 sm:px-6 sm:py-5 border-b border-destructive/10">
          <div className="h-6 w-36 bg-destructive/30 rounded-md mb-2" />
          <div className="h-4 w-80 bg-muted/25 rounded-md" />
        </div>
        <div className="p-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl border border-destructive/10 bg-destructive/5">
            <div className="space-y-1">
              <div className="h-4 w-40 bg-destructive/40 rounded" />
              <div className="h-3 w-64 bg-muted/25 rounded" />
            </div>
            <div className="h-9 w-28 rounded-lg bg-destructive/20" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl border border-destructive/10 bg-destructive/5">
            <div className="space-y-1">
              <div className="h-4 w-36 bg-destructive/40 rounded" />
              <div className="h-3 w-72 bg-muted/25 rounded" />
            </div>
            <div className="h-9 w-28 rounded-lg bg-destructive/20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ManagementFormSkeleton() {
  return (
    <div className="space-y-6 w-full animate-pulse">
      <div className="h-4 w-24 bg-muted/30 rounded" />
      <div className="flex flex-col bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-primary/10 rounded-xl p-5 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted/40 rounded" />
          <div className="h-4 w-72 bg-muted/25 rounded" />
        </div>
        <div className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <div className="h-4 w-28 bg-muted/30 rounded" />
            <div className="h-10 w-full rounded-xl bg-card/40 border border-primary/10" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-muted/30 rounded" />
            <div className="h-10 w-full rounded-xl bg-card/40 border border-primary/10" />
          </div>
          <div className="h-10 w-36 rounded-xl bg-primary/20 mt-4" />
        </div>
      </div>
    </div>
  );
}

export function PublicProfileCardSkeleton() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between pt-24 pb-16 px-4 sm:px-6">
      <div className="relative z-10 w-full max-w-3xl mx-auto flex-1 flex flex-col justify-center">
        <div className="w-full rounded-3xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-2xl shadow-2xl p-6 sm:p-10 animate-pulse">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-muted/40 shrink-0 border-2 border-white/60 dark:border-white/20" />
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="h-8 w-48 bg-muted/40 rounded-xl" />
                <div className="h-5 w-20 bg-primary/20 rounded-full" />
              </div>
              <div className="h-4 w-32 bg-muted/30 rounded" />
              <div className="flex gap-2 pt-2 justify-center sm:justify-start">
                <div className="h-9 w-24 rounded-xl bg-muted/30" />
                <div className="h-9 w-28 rounded-xl bg-muted/30" />
              </div>
            </div>
          </div>

          {/* Bio lines */}
          <div className="mt-8 space-y-2 pt-6 border-t border-border/20">
            <div className="h-4 w-full bg-muted/25 rounded" />
            <div className="h-4 w-4/5 bg-muted/25 rounded" />
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-border/20">
            <div className="space-y-1">
              <div className="h-3 w-16 bg-muted/20 rounded" />
              <div className="h-5 w-24 bg-muted/30 rounded" />
            </div>
            <div className="space-y-1">
              <div className="h-3 w-20 bg-muted/20 rounded" />
              <div className="h-5 w-16 bg-muted/30 rounded" />
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <div className="h-3 w-16 bg-muted/20 rounded" />
              <div className="h-5 w-20 bg-muted/30 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthCardSkeleton() {
  return (
    <div className="w-full max-w-md p-5 sm:p-8 md:p-10 bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 shadow-2xl rounded-3xl flex flex-col mx-auto animate-pulse">
      {/* Brand & Title */}
      <div className="text-center mb-8 space-y-2">
        <div className="h-8 w-40 bg-muted/40 rounded-xl mx-auto mb-2" />
        <div className="h-4 w-56 bg-muted/25 rounded mx-auto" />
      </div>

      {/* Social Providers Buttons */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="h-11 rounded-xl bg-card/40 border border-primary/10" />
        <div className="h-11 rounded-xl bg-card/40 border border-primary/10" />
        <div className="h-11 rounded-xl bg-card/40 border border-primary/10" />
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-border/40 my-6" />

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-muted/30 rounded" />
          <div className="h-10 w-full rounded-xl bg-card/40 border border-primary/10" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 bg-muted/30 rounded" />
          <div className="h-10 w-full rounded-xl bg-card/40 border border-primary/10" />
        </div>
        <div className="h-11 w-full rounded-xl bg-primary/30 mt-6" />
      </div>

      {/* Footer Link */}
      <div className="h-4 w-48 bg-muted/25 rounded mx-auto mt-8" />
    </div>
  );
}

export function ConsentCardSkeleton() {
  return (
    <div className="w-full max-w-lg mx-auto p-6 sm:p-8 bg-background/80 backdrop-blur-2xl border border-primary/20 rounded-3xl flex flex-col animate-pulse shadow-2xl">
      {/* App Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-muted/40 shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-6 w-36 bg-muted/40 rounded" />
          <div className="h-4 w-52 bg-muted/25 rounded" />
        </div>
      </div>

      {/* Permissions Box */}
      <div className="rounded-2xl border border-primary/10 bg-card/30 p-4 space-y-3 mb-6">
        <div className="h-4 w-32 bg-muted/30 rounded" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted/20 rounded" />
          <div className="h-4 w-4/5 bg-muted/20 rounded" />
          <div className="h-4 w-3/5 bg-muted/20 rounded" />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <div className="h-11 flex-1 rounded-xl bg-muted/30" />
        <div className="h-11 flex-1 rounded-xl bg-primary/30" />
      </div>
    </div>
  );
}
