"use client";

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
import { useTranslations } from "@/lib/i18n/hooks";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface EditUsernameFormProps {
  initialData: {
    username: string;
    username_last_changed?: Date | null;
  };
}

export function EditUsernameForm({ initialData }: EditUsernameFormProps) {
  const router = useRouter();
  const { t } = useTranslations("schema_profile");
  const { t: tUI } = useTranslations("profile_personal");

  const daysSinceChange = initialData.username_last_changed 
    ? Math.floor((new Date().getTime() - new Date(initialData.username_last_changed).getTime()) / (1000 * 60 * 60 * 24))
    : 60;
  
  const isLocked = daysSinceChange < 60;
  const daysRemaining = 60 - daysSinceChange;

  const form = useForm<UsernameValues>({
    resolver: zodResolver(getUsernameSchema(t)),
    defaultValues: {
      username: initialData.username,
    },
  });

  const onSubmit = async (data: UsernameValues) => {
    const res = await updateProfileUsername(data);
    
    if (res.success) {
      toast.success("Profile updated", { description: "Your username has been updated successfully." });
      router.push("/profile");
    } else {
      toast.error("Error", { description: res.error || "Failed to update profile" });
    }
  };

  const isSaving = form.formState.isSubmitting;

  return (
    <section>
      <header className="mb-15">
        <h2 className="text-2xl font-semibold tracking-tight mb-1">{tUI("editUsername.title")}</h2>
        <p className="text-muted-foreground text-sm">{tUI("editUsername.desc")}</p>
      </header>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {isLocked ? (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-xl text-sm" dangerouslySetInnerHTML={{ __html: tUI("editUsername.lockedMsg").replace("{days}", `<strong>${daysRemaining}</strong>`) }} />
          ) : (
            <div className="p-4 bg-primary/10 border border-primary/20 text-primary rounded-xl text-sm" dangerouslySetInnerHTML={{ __html: tUI("editUsername.warningMsg") }} />
          )}

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tUI("editUsername.label")}</FormLabel>
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
            <Link href="/profile" className={buttonVariants({ variant: "ghost", className: "h-9" })}>
              {tUI("editUsername.cancel")}
            </Link>
            <Button type="submit" disabled={isSaving || isLocked} className={buttonVariants({ className: "h-9" })}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {tUI("editUsername.save")}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
