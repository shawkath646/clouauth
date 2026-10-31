"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfileUsername } from "@/actions/profile/personal-info.actions";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getUsernameSchema, UsernameValues } from "@/schema/profile.schema";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/types/i18n.types";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export interface EditUsernameFormProps {
  initialData: {
    username: string;
    username_last_changed?: Date | string | null;
  };
  locale?: Locale;
  schemaDict: Dictionary<"schema_profile">;
  personalDict: Dictionary<"profile_personal">["editUsername"];
}

export function EditUsernameForm({
  initialData,
  locale = defaultLocale,
  schemaDict,
  personalDict,
}: EditUsernameFormProps) {
  const router = useRouter();
  const [daysSinceChange, setDaysSinceChange] = useState<number>(60);

  useEffect(() => {
    if (!initialData.username_last_changed) {
      setDaysSinceChange(60);
      return;
    }
    const elapsedDays = Math.floor(
      (Date.now() - new Date(initialData.username_last_changed).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    setDaysSinceChange(elapsedDays);
  }, [initialData.username_last_changed]);

  const isLocked = daysSinceChange < 60;
  const daysRemaining = 60 - daysSinceChange;

  const form = useForm<UsernameValues>({
    resolver: zodResolver(getUsernameSchema(schemaDict)),
    defaultValues: {
      username: initialData.username,
    },
  });

  const onSubmit = async (data: UsernameValues) => {
    const res = await updateProfileUsername(data, locale);
    
    if (res.success) {
      toast.success("Profile updated", { description: "Your username has been updated successfully." });
      router.push(`/${locale}/profile`);
    } else {
      toast.error("Error", { description: res.error || "Failed to update profile" });
    }
  };

  const isSaving = form.formState.isSubmitting;

  return (
    <section>
      <header className="mb-15">
        <h2 className="text-2xl font-semibold tracking-tight mb-1">{personalDict.title}</h2>
        <p className="text-muted-foreground text-sm">{personalDict.desc}</p>
      </header>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {isLocked ? (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-xl text-sm" dangerouslySetInnerHTML={{ __html: personalDict.lockedMsg.replace("{days}", `<strong>${daysRemaining}</strong>`) }} />
          ) : (
            <div className="p-4 bg-primary/10 border border-primary/20 text-primary rounded-xl text-sm" dangerouslySetInnerHTML={{ __html: personalDict.warningMsg }} />
          )}

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{personalDict.label}</FormLabel>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground z-10">@</span>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="pl-8"
                      autoComplete="username"
                      disabled={isLocked}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex items-center justify-end gap-3 mt-10">
            <Link href={`/${locale}/profile`} className={buttonVariants({ variant: "ghost", className: "h-9" })}>
              {personalDict.cancel}
            </Link>
            <Button type="submit" disabled={isSaving || isLocked} className={buttonVariants({ className: "h-9" })}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {personalDict.save}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
