"use client";

import { useState } from "react";
import { SectionCard } from "@/components/profile/section-card";
import { Button } from "@/components/ui/button";
import { Smartphone, Plus, Loader2, Trash2 } from "lucide-react";
import { removeTwoFactorMethodAction } from "@/actions/profile/security-info.actions";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n/hooks";
import { Label } from "@/components/ui/label";

import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

interface PhoneMethod {
  id: string;
  type: string;
  enabled: boolean;
  added_on: Date | string;
}

interface PhoneManagementPageProps {
  phones: PhoneMethod[];
}

export function PhoneManagementPage({ phones }: PhoneManagementPageProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { t: tUI } = useTranslations("profile_security");
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>(undefined);

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await removeTwoFactorMethodAction(id);
      if (res.success) {
        toast.success("Phone number removed");
      } else {
        toast.error("Error", { description: res.error });
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setRemovingId(null);
    }
  };

  if (isAdding) {
    return (
      <SectionCard
        title={tUI("phone.editTitle")}
        description={tUI("phone.editDesc")}
      >
        <div className="space-y-6 max-w-md">
          <div className="space-y-2">
            <Label>{tUI("phone.label")}</Label>
            <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <PhoneInput
                placeholder={tUI("phone.placeholder")}
                value={phoneNumber}
                onChange={setPhoneNumber}
                defaultCountry="US"
                className="w-full flex"
                style={{ "--PhoneInput-color--focus": "transparent" } as any}
                numberInputProps={{
                  className: "w-full border-0 bg-transparent p-0 text-sm focus:outline-none focus:ring-0 ml-2"
                }}
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-3 pt-2">
            <Button type="button" disabled className="w-full">
              Send Code
            </Button>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-1/2"
                onClick={() => {
                  setIsAdding(false);
                  setPhoneNumber("");
                }}
              >
                {tUI("phone.cancel")}
              </Button>
              <Button type="button" disabled className="w-1/2">
                Save
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={tUI("phone.title")}
      description={tUI("phone.desc")}
      noPadding
      headerAction={
        phones.length > 0 ? (
          <Button
            onClick={() => setIsAdding(true)}
            size="sm"
            variant="outline"
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{tUI("phone.addBtn")}</span>
          </Button>
        ) : undefined
      }
    >
      {phones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Smartphone className="w-7 h-7 text-primary" />
          </div>
          <h4 className="text-base font-semibold mb-1">{tUI("phone.noPhoneTitle")}</h4>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            {tUI("phone.noPhoneDesc")}
          </p>
          <Button
            onClick={() => setIsAdding(true)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{tUI("phone.editTitle")}</span>
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {phones.map((phone) => (
            <div
              key={phone.id}
              className="flex items-center justify-between px-5 py-4 sm:px-6 hover:bg-muted/10 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-base font-semibold">{tUI("phone.activeTitle")}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {tUI("phone.activeDesc").replace("{date}", new Date(phone.added_on).toLocaleDateString())}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(phone.id)}
                disabled={removingId === phone.id}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {removingId === phone.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
                <span>{tUI("phone.removeBtn")}</span>
              </Button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
