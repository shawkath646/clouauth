"use client";

import { SectionCard } from "@/components/profile/section-card";
import { Download, FileText, Eye } from "lucide-react";
import { EditableField } from "@/components/profile/editable-field";
import type { FullProfile } from "@/types/profile.types";
import { BrandName } from "@/components/ui/brand-name";
import { useTranslations } from "@/lib/i18n/hooks";
import { Button } from "@/components/ui/button";

export function PrivacySection({ profile: _profile }: { profile: FullProfile }) {
  const { t } = useTranslations("profile_personal");

  return (
    <div className="space-y-6">
      <SectionCard title={t('privacySection.title')} description={t('privacySection.desc')} noPadding>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h4 className="text-base font-semibold truncate">{t('privacySection.downloadData')}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('privacySection.downloadDataDesc')} <BrandName /> {t('privacySection.downloadDataDesc2')}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="ml-4 shrink-0">
            {t('privacySection.requestDownload')}
          </Button>
        </div>
        <EditableField 
          label={t('privacySection.privacyPolicy')} 
          value={t('privacySection.privacyPolicyDesc')} 
          icon={<FileText className="w-5 h-5" />}
          onEdit={() => {}} 
          editLabel={t('privacySection.viewPolicy')}
        />
        <EditableField 
          label={t('privacySection.activityVisibility')} 
          value={t('privacySection.activityVisibilityDesc')} 
          icon={<Eye className="w-5 h-5" />}
          onEdit={() => {}} 
          editLabel="Manage"
          showSeparator={false}
        />
      </SectionCard>
    </div>
  );
}
