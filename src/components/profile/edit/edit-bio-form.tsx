"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateProfileBio } from "@/actions/profile/personal-info.actions";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getBioSchema, BioValues } from "@/schema/profile.schema";
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

export interface EditBioFormProps {
  initialData: {
    bio?: string | null;
  };
  locale?: Locale;
  schemaDict: Dictionary<"schema_profile">;
  personalDict: Dictionary<"profile_personal">["editBio"];
}

export function EditBioForm({
  initialData,
  locale = defaultLocale,
  schemaDict,
  personalDict,
}: EditBioFormProps) {
  const form = useForm<BioValues>({
    resolver: zodResolver(getBioSchema(schemaDict)),
    defaultValues: {
      bio: initialData.bio || "",
    },
  });

  const onSubmit = async (data: BioValues) => {
    const res = await updateProfileBio(data, locale);
    
    if (res && !res.success) {
      toast.error("Error", { description: res.error || "Failed to update profile" });
    }
  };

  const isSaving = form.formState.isSubmitting;
  const bioValue = useWatch({ control: form.control, name: "bio" }) || "";

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
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{personalDict.label}</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field}
                    value={field.value || ""}
                    rows={4}
                    placeholder={personalDict.placeholder}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground text-right">{bioValue.length}/500</p>
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
