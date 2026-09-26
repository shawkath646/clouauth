"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils/utils";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle2,
  Lock,
  Globe,
  ExternalLink,
  Share2,
  Check,
  Settings,
  Sparkles,
  Layers,
  ArrowRight,
  Shield,
} from "lucide-react";
import type { ProfileVisibility } from "@/types/preferences.types";

export interface SerializedApp {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  website: string | null;
}

export interface SerializedProfile {
  id: string;
  username: string;
  displayName: string;
  initials: string;
  avatar: string;
  bio: string | null;
  pronouns: string | null;
  formattedJoinDate: string;
  isVerified: boolean;
  visibility: ProfileVisibility;
  isOwner: boolean;
  apps: SerializedApp[];
}

export interface PublicProfileViewProps {
  isPrivate: boolean;
  userMeta?: {
    username: string;
    first_name: string;
  };
  profile?: SerializedProfile;
  hasSession: boolean;
  profileUrl: string;
}

export function PublicProfileView({
  isPrivate,
  userMeta,
  profile,
  hasSession,
  profileUrl,
}: PublicProfileViewProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `@${profile?.username || userMeta?.username} on clouburstlab`,
          text: `View @${profile?.username || userMeta?.username}'s public profile on clouburstlab`,
          url: profileUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Profile link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(profileUrl);
        setCopied(true);
        toast.success("Profile link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Could not copy link");
      }
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between pt-24 pb-16 px-4 sm:px-6">
      <div className="relative z-10 w-full max-w-3xl mx-auto flex-1 flex flex-col justify-center">
        {/* Subtle Non-Aggressive Prompt to Join (when visitor has no session) */}
        {!hasSession && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-5 flex items-center justify-between gap-3 px-4 py-2 rounded-full border border-primary/20 bg-background/70 dark:bg-card/40 backdrop-blur-xl text-xs text-muted-foreground shadow-xs"
          >
            <span className="flex items-center gap-2 truncate">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">
                Create your own clouburstlab profile & developer identity.
              </span>
            </span>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline shrink-0"
            >
              <span>Get yours</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </motion.div>
        )}

        {/* Private State (when viewed by a non-owner) */}
        {isPrivate && userMeta && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 rounded-2xl p-8 sm:p-12 text-center shadow-xl"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-4">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-1">
              Private Profile
            </h1>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              @{userMeta.username} has set their profile to private. Only the account owner can view this page.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Return to Home
              </Link>
              {!hasSession && (
                <Link
                  href="/signin"
                  className={cn(buttonVariants({ variant: "default", size: "sm" }))}
                >
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        )}

        {/* Full Public Profile View */}
        {!isPrivate && profile && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {/* Owner-Only Private Preview Banner (notice: no "View with links" tagline) */}
            {profile.isOwner && profile.visibility === "private" && (
              <div className="px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 truncate">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    <strong>Private Preview:</strong> This profile is currently hidden from other users.
                  </span>
                </div>
                <Link
                  href="/profile/privacy"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "xs" }),
                    "border-amber-500/30 shrink-0"
                  )}
                >
                  Change
                </Link>
              </div>
            )}

            {/* Compact Profile Header Shell */}
            <div className="bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              {/* Subtle Ambient Accent */}
              <div className="absolute top-0 right-0 w-64 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

              <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
                {/* Avatar */}
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-primary/20 shadow-md shrink-0">
                  <AvatarImage src={profile.avatar} alt={profile.displayName} />
                  <AvatarFallback className="bg-primary/15 text-primary text-2xl font-bold">
                    {profile.initials}
                  </AvatarFallback>
                </Avatar>

                {/* Info & Actions */}
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                          {profile.displayName}
                        </h1>
                        {profile.isVerified && (
                          <Badge
                            variant="outline"
                            className="bg-primary/10 text-primary border-primary/20 gap-1 text-[11px] h-5 px-1.5"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </Badge>
                        )}
                        {profile.pronouns && (
                          <span className="text-xs text-muted-foreground/80 bg-muted/60 px-2 py-0.5 rounded-md font-mono">
                            {profile.pronouns}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
                        @{profile.username}
                      </p>
                    </div>

                    {/* Actions: Share & Optional Edit */}
                    <div className="flex items-center justify-center sm:justify-end gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleShare}
                        className="h-8 gap-1.5 text-xs"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Share</span>
                          </>
                        )}
                      </Button>

                      {profile.isOwner && (
                        <Link
                          href="/profile/edit"
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "h-8 gap-1.5 text-xs"
                          )}
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {profile.bio ? (
                    <p className="text-sm text-foreground/90 mt-3 leading-relaxed whitespace-pre-line max-w-xl">
                      {profile.bio}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/70 italic mt-2">
                      clouburstlab ecosystem member
                    </p>
                  )}

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-5 pt-4 border-t border-border/40 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>Joined {profile.formattedJoinDate}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      <span>clouburstlab ID</span>
                    </div>

                    {profile.isOwner && profile.visibility === "public" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10 gap-1 h-5"
                      >
                        <Globe className="w-2.5 h-2.5" />
                        Public
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Connected Applications / Projects (Compact Grid) */}
            {profile.apps.length > 0 && (
              <div className="bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 rounded-2xl p-5 sm:p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold tracking-tight text-foreground uppercase tracking-wider">
                    Applications ({profile.apps.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profile.apps.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20 hover:border-primary/30 hover:bg-muted/40 transition-all gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {app.icon ? (
                          <Image
                            src={app.icon}
                            alt={app.name}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-lg object-contain border border-border/50 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {app.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {app.name}
                          </p>
                          {app.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">
                              {app.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {app.website && (
                        <a
                          href={app.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
                          title="Visit Application"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
