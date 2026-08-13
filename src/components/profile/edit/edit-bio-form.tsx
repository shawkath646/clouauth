"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateProfileBio } from "@/actions/profile/personal-info.actions";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getBioSchema, BioValues } from "@/schema/profile.schema";
import { useTranslations } from "@/lib/i18n/hooks";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface EditBioFormProps {
  initialData: {
    bio?: string | null;
  };
}

export function EditBioForm({ initialData }: EditBioFormProps) {
  const router = useRouter();
  const { t } = useTranslations("schema_profile");
  const { t: tUI } = useTranslations("profile_personal");

  const form = useForm<BioValues>({
    resolver: zodResolver(getBioSchema(t)),
    defaultValues: {
      bio: initialData.bio || "",
    },
  });

  const onSubmit = async (data: BioValues) => {
    const res = await updateProfileBio(data);
    
    if (res && !res.success) {
      toast.error("Error", { description: res.error || "Failed to update profile" });
    }
  };

  const isSaving = form.formState.isSubmitting;
  const bioValue = useWatch({ control: form.control, name: "bio" }) || "";

  return (
    <section>
      <header className="mb-15">
        <h2 className="text-2xl font-semibold tracking-tight mb-1">{tUI("editBio.title")}</h2>
        <p className="text-muted-foreground text-sm">{tUI("editBio.desc")}</p>
      </header>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tUI("editBio.label")}</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field}
                    value={field.value || ""}
                    rows={4}
                    placeholder={tUI("editBio.placeholder")}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground text-right">{bioValue.length}/500</p>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex items-center justify-end gap-3 mt-10">
            <Link href="/profile" className={buttonVariants({ variant: "ghost", className: "h-9" })}>
              {tUI("editBio.cancel")}
            </Link>
            <Button type="submit" disabled={isSaving} className={buttonVariants({ className: "h-9" })}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {tUI("editBio.save")}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
