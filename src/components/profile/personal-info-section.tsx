"use client";

import Link from "next/link";
import { SectionCard } from "@/components/profile/section-card";
import { ProfileFieldLink } from "@/components/profile/profile-field-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronRight } from "lucide-react";
import type { FullProfile } from "@/types/profile.types";
import { DBAddress } from "@/types/user.types";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/types/i18n.types";
import { formatTime } from "@/utils/utils";

export interface PersonalInfoSectionProps {
  profile: FullProfile;
  locale?: Locale;
  dict: Dictionary<"profile_personal">["infoSection"];
}

export function PersonalInfoSection({
  profile,
  locale = defaultLocale,
  dict,
}: PersonalInfoSectionProps) {
  const initials = `${profile.user.first_name[0] || ""}${profile.user.last_name[0] || ""}`.toUpperCase();
  const primaryEmail = profile.emails.find(e => e.is_primary) || profile.emails[0];
  const defaultAddress = profile.addresses?.find(a => a.is_default) || profile.addresses?.[0];
  const joinDate = formatTime(profile.user.created_on, {
    format: "date",
    locale,
    month: "long",
    preferences: profile.preferences,
  });

  const formatAddress = (addr: DBAddress) => {
    if (!addr) return dict.notSet;
    const parts = [addr.address_1, addr.address_2, addr.city, addr.state, addr.zip_code, addr.country].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <div className="space-y-6">
      <SectionCard 
        title={dict.title} 
        description={dict.desc}
        noPadding
      >
        <Link 
          href={`/${locale}/profile/edit?field=avatar`}
          className="w-full flex items-center justify-between px-5 py-4 sm:px-6 gap-4 text-left transition-colors hover:bg-muted/10 cursor-pointer"
        >
          <span className="text-sm font-medium text-foreground shrink-0">{dict.profilePic}</span>
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border border-primary/10 shadow-sm">
              <AvatarImage src={profile.user.avatar} alt={profile.user.first_name} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
            </Avatar>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          </div>
        </Link>
        <Separator className="opacity-50" />
        
        <ProfileFieldLink 
          label={dict.fullName} 
          value={`${profile.user.first_name} ${profile.user.last_name}`} 
          href={`/${locale}/profile/edit?field=name`}
        />
        <ProfileFieldLink 
          label={dict.username} 
          value={`@${profile.user.username}`} 
          href={`/${locale}/profile/edit?field=username`}
        />
        <ProfileFieldLink 
          label={dict.pronouns} 
          value={profile.user.pronouns || dict.notSet} 
          href={`/${locale}/profile/edit?field=pronouns`}
        />
        <ProfileFieldLink 
          label={dict.email} 
          value={primaryEmail?.address || dict.notSet} 
          badge={primaryEmail?.verified ? <Badge variant="outline" className="border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10">{dict.verified}</Badge> : <Badge variant="outline" className="border-yellow-500/30 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10">{dict.unverified}</Badge>}
        />
        <ProfileFieldLink 
          label={dict.phone} 
          value={dict.notSet} 
        />
        <ProfileFieldLink 
          label={dict.address} 
          value={formatAddress(defaultAddress)} 
          href={`/${locale}/profile/edit?field=address`}
        />
        <ProfileFieldLink 
          label={dict.bio} 
          value={profile.user.bio || dict.notProvided} 
          href={`/${locale}/profile/edit?field=bio`}
        />
        <ProfileFieldLink 
          label={dict.joined} 
          value={joinDate} 
          showSeparator={false}
        />
      </SectionCard>
    </div>
  );
}
