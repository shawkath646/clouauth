"use client";

import { useState, useRef } from "react";
import { SectionCard } from "@/components/profile/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Plus, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { updateRecoveryEmailAction, sendRecoveryEmailVerificationCodeAction, verifyRecoveryEmailAction } from "@/actions/profile/security-info.actions";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getEmailSchema, EmailValues } from "@/schema/security.schema";
import type { Dictionary } from "@/types/i18n.types";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export interface RecoveryEmailManagementPageProps {
  email?: string;
  isVerified?: boolean;
  schemaDict: Dictionary<"schema_security">;
  securityDict: Dictionary<"profile_security">["email"];
}

export function RecoveryEmailManagementPage({
  email,
  isVerified,
  schemaDict,
  securityDict,
}: RecoveryEmailManagementPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isVerifyingState, setIsVerifyingState] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const lastSubmittedCodeRef = useRef("");

  const form = useForm<EmailValues>({
    resolver: zodResolver(getEmailSchema(schemaDict)),
    defaultValues: {
      email: email || "",
    },
  });

  const onSubmit = async (data: EmailValues) => {
    const res = await updateRecoveryEmailAction(data);
    
    if (res.success) {
      toast.success("Recovery email updated");
      setIsEditing(false);
      window.location.reload();
    } else {
      toast.error("Error", { description: res.error });
    }
  };

  const handleSendVerification = async () => {
    if (!email) return;
    setIsSendingCode(true);
    try {
      const res = await sendRecoveryEmailVerificationCodeAction(email);
      if (res.success) {
        toast.success("Verification code sent to your recovery email");
        setIsVerifyingState(true);
      } else {
        toast.error("Error", { description: res.error });
      }
    } catch {
      toast.error("Failed to send verification code");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async (valToVerify?: string) => {
    const targetCode = valToVerify || verificationCode;
    if (targetCode.length !== 6 || isVerifyingCode || lastSubmittedCodeRef.current === targetCode) return;

    lastSubmittedCodeRef.current = targetCode;
    setIsVerifyingCode(true);
    try {
      const res = await verifyRecoveryEmailAction(targetCode);
      if (res.success) {
        toast.success("Recovery email verified successfully");
        setIsVerifyingState(false);
        setVerificationCode("");
        window.location.reload();
      } else {
        toast.error("Verification failed", { description: res.error });
      }
    } catch {
      toast.error("An error occurred during verification");
    } finally {
      setIsVerifyingCode(false);
      lastSubmittedCodeRef.current = "";
    }
  };

  const isSaving = form.formState.isSubmitting;

  if (isVerifyingState) {
    return (
      <SectionCard title="Verify Recovery Email" description={securityDict.desc}>
        <div className="space-y-4 max-w-md py-2">
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit verification code sent to <strong>{email}</strong>
          </p>
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(val);
                if (val.length === 6) {
                  handleVerifyCode(val);
                }
              }}
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
              {securityDict.cancel}
            </Button>
            <Button 
              type="button" 
              onClick={() => handleVerifyCode()} 
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
        title={email ? securityDict.editTitleChange : securityDict.editTitleAdd}
        description={securityDict.editDesc}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{securityDict.label}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder={securityDict.placeholder}
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
                {securityDict.cancel}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {securityDict.saveBtn}
              </Button>
            </div>
          </form>
        </Form>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={securityDict.title}
      description={securityDict.desc}
      noPadding
      headerAction={
        email ? (
          <Button
            onClick={() => setIsEditing(true)}
            size="sm"
            variant="outline"
          >
            {securityDict.changeBtn}
          </Button>
        ) : undefined
      }
    >
      {!email ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          <h4 className="text-base font-semibold mb-1">{securityDict.noEmailTitle}</h4>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            {securityDict.noEmailDesc}
          </p>
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{securityDict.addBtn}</span>
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
                {isVerified ? securityDict.activeDesc : "Unverified recovery email"}
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
