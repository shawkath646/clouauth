"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getNameSchema, type NameValues } from "@/schema/profile.schema";
import { updateProfileName } from "@/actions/profile/personal-info.actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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

export interface EditNameFormProps {
  initialData: {
    first_name: string;
    last_name: string;
  };
  locale?: Locale;
  schemaDict: Dictionary<"schema_profile">;
  personalDict: Dictionary<"profile_personal">["editName"];
}

export function EditNameForm({
  initialData,
  locale = defaultLocale,
  schemaDict,
  personalDict,
}: EditNameFormProps) {
  const form = useForm<NameValues>({
    resolver: zodResolver(getNameSchema(schemaDict)),
    defaultValues: {
      first_name: initialData.first_name,
      last_name: initialData.last_name,
    },
  });

  const onSubmit = async (data: NameValues) => {
    const res = await updateProfileName(data, locale);
    
    if (res && !res.success) {
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
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{personalDict.firstLabel}</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="given-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{personalDict.lastLabel}</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="family-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex items-center justify-end gap-3 mt-10">
            <Link href={`/${locale}/profile`} className={buttonVariants({ variant: "ghost", className: "h-9" })}>
              {personalDict.cancel}
            </Link>
            <Button type="submit" disabled={isSaving} className={buttonVariants({ className: "h-9" })}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {personalDict.save}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
