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
import { useTranslations } from "@/lib/i18n/hooks";

export function PersonalInfoSection({ profile }: { profile: FullProfile }) {
  const { t } = useTranslations("profile_personal");

  const initials = `${profile.user.first_name[0] || ""}${profile.user.last_name[0] || ""}`.toUpperCase();
  const primaryEmail = profile.emails.find(e => e.is_primary) || profile.emails[0];
  const defaultAddress = profile.addresses?.find(a => a.is_default) || profile.addresses?.[0];
  const joinDate = new Date(profile.user.created_on).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const formatAddress = (addr: DBAddress) => {
    if (!addr) return t('infoSection.notSet');
    const parts = [addr.address_1, addr.address_2, addr.city, addr.state, addr.zip_code, addr.country].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <div className="space-y-6">
      <SectionCard 
        title={t('infoSection.title')} 
        description={t('infoSection.desc')}
        noPadding
      >
        <Link 
          href="/profile/edit?field=avatar"
          className="w-full flex items-center justify-between px-5 py-4 sm:px-6 gap-4 text-left transition-colors hover:bg-muted/10 cursor-pointer"
        >
          <span className="text-sm font-medium text-foreground shrink-0">{t('infoSection.profilePic')}</span>
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
          label={t('infoSection.fullName')} 
          value={`${profile.user.first_name} ${profile.user.last_name}`} 
          href="/profile/edit?field=name"
        />
        <ProfileFieldLink 
          label={t('infoSection.username')} 
          value={`@${profile.user.username}`} 
          href="/profile/edit?field=username"
        />
        <ProfileFieldLink 
          label={t('infoSection.pronouns')} 
          value={profile.user.pronouns || t('infoSection.notSet')} 
          href="/profile/edit?field=pronouns"
        />
        <ProfileFieldLink 
          label={t('infoSection.email')} 
          value={primaryEmail?.address || t('infoSection.notSet')} 
          badge={primaryEmail?.verified ? <Badge variant="outline" className="border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10">{t('infoSection.verified')}</Badge> : <Badge variant="outline" className="border-yellow-500/30 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10">{t('infoSection.unverified')}</Badge>}
        />
        <ProfileFieldLink 
          label={t('infoSection.phone')} 
          value={t('infoSection.notSet')} 
        />
        <ProfileFieldLink 
          label={t('infoSection.address')} 
          value={formatAddress(defaultAddress)} 
          href="/profile/edit?field=address"
        />
        <ProfileFieldLink 
          label={t('infoSection.bio')} 
          value={profile.user.bio || t('infoSection.notProvided')} 
          href="/profile/edit?field=bio"
        />
        <ProfileFieldLink 
          label={t('infoSection.joined')} 
          value={joinDate} 
          showSeparator={false}
        />
      </SectionCard>
    </div>
  );
}
