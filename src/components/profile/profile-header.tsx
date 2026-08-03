"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import type { FullProfile } from "@/types/profile.types";

export function ProfileHeader({ profile }: { profile: FullProfile }) {
  const initials = `${profile.user.first_name[0] || ""}${profile.user.last_name[0] || ""}`.toUpperCase();
  const primaryEmail = profile.emails.find(e => e.is_primary)?.address || profile.emails[0]?.address;
  const isVerified = profile.emails.some(e => e.verified);
  const joinDate = new Date(profile.user.created_on).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
      transition={{ duration: 0.5 }}
      className="flex flex-col sm:flex-row items-center sm:items-start gap-4 px-5 py-4 sm:px-6 sm:py-4 mb-6 sm:mb-8 bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-primary/10 dark:border-primary/10 rounded-xl"
    >
      <Avatar className="w-20 h-20 border-2 border-background/50 shadow-sm">
        <AvatarImage src={profile.user.avatar} alt={profile.user.first_name} />
        <AvatarFallback className="bg-primary/20 text-primary text-2xl font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{profile.user.first_name} {profile.user.last_name}</h1>
          {isVerified && (
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 mt-1 sm:mt-0">
              <CheckCircle2 className="w-3 h-3" />
              Verified
            </Badge>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2 mt-1">
          <p className="text-sm font-medium text-foreground">@{profile.user.username}</p>
          <span className="hidden sm:inline text-muted-foreground opacity-50">•</span>
          <p className="text-sm text-muted-foreground">{primaryEmail}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Member since {joinDate}</p>
      </div>
    </motion.div>
  );
}
