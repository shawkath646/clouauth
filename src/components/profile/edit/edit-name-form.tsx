"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfileName } from "@/actions/profile/personal-info.actions";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getNameSchema, NameValues } from "@/schema/profile.schema";
import { useTranslations } from "@/lib/i18n/hooks";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface EditNameFormProps {
  initialData: {
    first_name: string;
    last_name: string;
  };
}

export function EditNameForm({ initialData }: EditNameFormProps) {
  const router = useRouter();
  const { t } = useTranslations("schema_profile");
  const { t: tUI } = useTranslations("profile_personal");
  
  const form = useForm<NameValues>({
    resolver: zodResolver(getNameSchema(t)),
    defaultValues: {
      first_name: initialData.first_name,
      last_name: initialData.last_name,
    },
  });

  const onSubmit = async (data: NameValues) => {
    const res = await updateProfileName(data);
    
    if (res && !res.success) {
      toast.error("Error", { description: res.error || "Failed to update profile" });
    }
  };

  const isSaving = form.formState.isSubmitting;

  return (
    <section>
      <header className="mb-15">
        <h2 className="text-2xl font-semibold tracking-tight mb-1">{tUI("editName.title")}</h2>
        <p className="text-muted-foreground text-sm">{tUI("editName.desc")}</p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tUI("editName.firstLabel")}</FormLabel>
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
                <FormLabel>{tUI("editName.lastLabel")}</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="family-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex items-center justify-end gap-3 mt-10">
            <Link href="/profile" className={buttonVariants({ variant: "ghost", className: "h-9" })}>
              {tUI("editName.cancel")}
            </Link>
            <Button type="submit" disabled={isSaving} className={buttonVariants({ className: "h-9" })}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {tUI("editName.save")}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
