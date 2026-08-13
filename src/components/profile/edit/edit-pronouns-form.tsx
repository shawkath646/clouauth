"use client";

import { useRouter } from "next/navigation";
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
import { useTranslations } from "@/lib/i18n/hooks";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface EditPronounsFormProps {
  initialData: {
    pronouns?: string | null;
  };
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

export function EditPronounsForm({ initialData }: EditPronounsFormProps) {
  const router = useRouter();
  const { t } = useTranslations("schema_profile");
  const { t: tUI } = useTranslations("profile_personal");

  const form = useForm<PronounsValues>({
    resolver: zodResolver(getPronounsSchema(t)),
    defaultValues: {
      pronouns: initialData.pronouns || "",
    },
  });

  const onSubmit = async (data: PronounsValues) => {
    const res = await updateProfilePronouns(data);
    
    // If we reach here, it means the server action failed (because success redirects)
    if (res && !res.success) {
      toast.error("Error", { description: res.error || "Failed to update profile" });
    }
  };

  const isSaving = form.formState.isSubmitting;

  return (
    <section>
      <header className="mb-15">
        <h2 className="text-2xl font-semibold tracking-tight mb-1">{tUI("editPronouns.title")}</h2>
        <p className="text-muted-foreground text-sm">{tUI("editPronouns.desc")}</p>
      </header>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="pronouns"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tUI("editPronouns.label")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={tUI("editPronouns.placeholder")} />
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
            <Link href="/profile" className={buttonVariants({ variant: "ghost", className: "h-9" })}>
              {tUI("editPronouns.cancel")}
            </Link>
            <Button type="submit" disabled={isSaving} className={buttonVariants({ className: "h-9" })}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {tUI("editPronouns.save")}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
