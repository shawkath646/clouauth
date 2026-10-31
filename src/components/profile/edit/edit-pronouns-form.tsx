"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProfilePronouns } from "@/actions/profile/personal-info.actions";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getPronounsSchema, PronounsValues } from "@/schema/profile.schema";
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

export interface EditPronounsFormProps {
  initialData: {
    pronouns?: string | null;
  };
  locale?: Locale;
  schemaDict: Dictionary<"schema_profile">;
  personalDict: Dictionary<"profile_personal">["editPronouns"];
}

const PRONOUN_OPTIONS = [
  "He/Him",
  "She/Her",
  "They/Them",
  "He/They",
  "She/They",
  "Any/All",
  "Prefer not to say",
  "Other"
];

export function EditPronounsForm({
  initialData,
  locale = defaultLocale,
  schemaDict,
  personalDict,
}: EditPronounsFormProps) {
  const form = useForm<PronounsValues>({
    resolver: zodResolver(getPronounsSchema(schemaDict)),
    defaultValues: {
      pronouns: initialData.pronouns || "",
    },
  });

  const onSubmit = async (data: PronounsValues) => {
    const res = await updateProfilePronouns(data, locale);
    
    // If we reach here, it means the server action failed (because success redirects)
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
            name="pronouns"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{personalDict.label}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={personalDict.placeholder} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRONOUN_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
