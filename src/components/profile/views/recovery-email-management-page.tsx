"use client";

import { useState } from "react";
import { SectionCard } from "@/components/profile/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Plus, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { updateRecoveryEmailAction, sendRecoveryEmailVerificationCodeAction, verifyRecoveryEmailAction } from "@/actions/profile/security-info.actions";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getEmailSchema, EmailValues } from "@/schema/security.schema";
import { useTranslations } from "@/lib/i18n/hooks";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface RecoveryEmailManagementPageProps {
  email?: string;
  isVerified?: boolean;
}

export function RecoveryEmailManagementPage({ email, isVerified }: RecoveryEmailManagementPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isVerifyingState, setIsVerifyingState] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const { t } = useTranslations("schema_security");
  const { t: tUI } = useTranslations("profile_security");

  const form = useForm<EmailValues>({
    resolver: zodResolver(getEmailSchema(t)),
    defaultValues: {
      email: email || "",
    },
  });

  const onSubmit = async (data: EmailValues) => {
    const res = await updateRecoveryEmailAction(data);
    
    if (res.success) {
      toast.success("Recovery email updated");
      setIsEditing(false);
    } else {
      toast.error("Error", { description: res.error });
    }
  };

  const handleSendVerification = async () => {
    if (!email) return;
    setIsSendingCode(true);
    const res = await sendRecoveryEmailVerificationCodeAction(email);
    setIsSendingCode(false);
    
    if (res.success) {
      toast.success("Verification code sent to " + email);
      setIsVerifyingState(true);
    } else {
      toast.error("Error", { description: res.error });
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) return;
    setIsVerifyingCode(true);
    const res = await verifyRecoveryEmailAction(verificationCode);
    setIsVerifyingCode(false);
    
    if (res.success) {
      toast.success("Recovery email verified successfully");
      setIsVerifyingState(false);
      setVerificationCode("");
    } else {
      toast.error("Verification failed", { description: res.error });
    }
  };

  const isSaving = form.formState.isSubmitting;

  if (isVerifyingState) {
    return (
      <SectionCard title="Verify Recovery Email" description={tUI("email.desc")}>
        <div className="space-y-4 max-w-md py-2">
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit verification code sent to <strong>{email}</strong>
          </p>
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-lg tracking-[0.5em] font-mono h-12"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsVerifyingState(false);
                setVerificationCode("");
              }}
              className="w-1/2"
            >
              {tUI("email.cancel")}
            </Button>
            <Button 
              type="button" 
              onClick={handleVerifyCode} 
              disabled={isVerifyingCode || verificationCode.length !== 6}
              className="w-1/2"
            >
              {isVerifyingCode && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Verify
            </Button>
          </div>
        </div>
      </SectionCard>
    );
  }

  if (isEditing) {
    return (
      <SectionCard
        title={email ? tUI("email.editTitleChange") : tUI("email.editTitleAdd")}
        description={tUI("email.editDesc")}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tUI("email.label")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder={tUI("email.placeholder")}
                      autoComplete="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  form.reset({ email: email || "" });
                }}
              >
                {tUI("email.cancel")}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {tUI("email.saveBtn")}
              </Button>
            </div>
          </form>
        </Form>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={tUI("email.title")}
      description={tUI("email.desc")}
      noPadding
      headerAction={
        email ? (
          <Button
            onClick={() => setIsEditing(true)}
            size="sm"
            variant="outline"
          >
            {tUI("email.changeBtn")}
          </Button>
        ) : undefined
      }
    >
      {!email ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          <h4 className="text-base font-semibold mb-1">{tUI("email.noEmailTitle")}</h4>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            {tUI("email.noEmailDesc")}
          </p>
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{tUI("email.addBtn")}</span>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-6 sm:px-6 gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isVerified ? "bg-green-500/10" : "bg-amber-500/10"}`}>
              {isVerified ? (
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
              )}
            </div>
            <div>
              <h4 className="text-base font-semibold">{email}</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isVerified ? tUI("email.activeDesc") : "Unverified recovery email"}
              </p>
            </div>
          </div>
          
          {!isVerified && (
            <Button
              onClick={handleSendVerification}
              variant="default"
              size="sm"
              disabled={isSendingCode}
            >
              {isSendingCode && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Verify Now
            </Button>
          )}
        </div>
      )}
    </SectionCard>
  );
}
