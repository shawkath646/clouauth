"use client";

import { SectionCard } from "@/components/profile/section-card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, Eye } from "lucide-react";
import { EditableField } from "@/components/profile/editable-field";
import type { FullProfile } from "@/types/profile.types";

export function PrivacySection({ profile }: { profile: FullProfile }) {
  return (
    <div className="space-y-6">
      <SectionCard title="Privacy & Data" description="Manage your data and privacy settings." noPadding>
        <EditableField 
          label="Download Your Data" 
          value="Get a copy of your CloudburstLab data." 
          icon={<Download className="w-5 h-5" />}
          onEdit={() => {}} 
          editLabel="Request Download"
        />
        <EditableField 
          label="Privacy Policy" 
          value="Review how we handle your information." 
          icon={<FileText className="w-5 h-5" />}
          onEdit={() => {}} 
          editLabel="View Policy"
        />
        <EditableField 
          label="Activity Visibility" 
          value="Control who can see your activity." 
          icon={<Eye className="w-5 h-5" />}
          onEdit={() => {}} 
          editLabel="Manage"
          showSeparator={false}
        />
      </SectionCard>
    </div>
  );
}
