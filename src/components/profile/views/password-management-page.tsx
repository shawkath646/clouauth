"use client";

import { useState } from "react";
import { SectionCard } from "@/components/profile/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, Plus, CheckCircle2, Loader2 } from "lucide-react";
import { updatePasswordAction } from "@/actions/profile/security-info.actions";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getPasswordSchema } from "@/schema/security.schema";
import type { Dictionary } from "@/types/i18n.types";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export interface PasswordManagementPageProps {
  hasPassword: boolean;
  lastChangedOn?: string;
  schemaDict: Dictionary<"schema_security">;
  securityDict: Dictionary<"profile_security">["password"];
}

export function PasswordManagementPage({
  hasPassword,
  lastChangedOn,
  schemaDict,
  securityDict,
}: PasswordManagementPageProps) {
  const [isEditing, setIsEditing] = useState(false);

  const confirmPasswordSchema = getPasswordSchema(schemaDict).extend({
    confirmPassword: z.string().min(1, schemaDict.password.confirm),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: schemaDict.password.mismatch,
    path: ["confirmPassword"],
  });

  type PasswordFormValues = z.infer<typeof confirmPasswordSchema>;

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(confirmPasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: PasswordFormValues) => {
    // Only send what backend expects
    const res = await updatePasswordAction({
      currentPassword: hasPassword ? data.currentPassword : null,
      newPassword: data.newPassword,
    });
    
    if (res.success) {
      toast.success(hasPassword ? "Password updated" : "Password set successfully");
      setIsEditing(false);
      form.reset();
    } else {
      toast.error("Error", { description: res.error });
    }
  };

  const isSaving = form.formState.isSubmitting;

  if (isEditing) {
    return (
      <SectionCard
        title={hasPassword ? securityDict.editTitleChange : securityDict.editTitleSet}
        description={securityDict.editDesc}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            {hasPassword && (
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{securityDict.currentLabel}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        value={field.value || ""}
                        autoComplete="current-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{securityDict.newLabel}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{securityDict.confirmLabel}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="new-password"
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
                  form.reset();
                }}
              >
                {securityDict.cancel}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {hasPassword ? securityDict.changeBtn : securityDict.setBtn}
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
    >
      {!hasPassword ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Key className="w-7 h-7 text-primary" />
          </div>
          <h4 className="text-base font-semibold mb-1">{securityDict.noPwdTitle}</h4>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            {securityDict.noPwdDesc}
          </p>
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{securityDict.setBtn}</span>
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-5 py-6 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 className="text-base font-semibold">{securityDict.activeTitle}</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                {securityDict.activeDesc.replace("{date}", lastChangedOn || "Unknown")}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
          >
            {securityDict.updateBtn}
          </Button>
        </div>
      )}
    </SectionCard>
  );
}
