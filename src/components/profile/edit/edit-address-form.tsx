"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfileAddress } from "@/actions/profile/personal-info.actions";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DBAddress } from "@/types/user.types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getAddressSchema, AddressValues } from "@/schema/profile.schema";
import { useTranslations } from "@/lib/i18n/hooks";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface EditAddressFormProps {
  initialData: {
    addresses?: DBAddress[];
  };
}

export function EditAddressForm({ initialData }: EditAddressFormProps) {
  const router = useRouter();
  const { t } = useTranslations("schema_profile");
  const { t: tUI } = useTranslations("profile_personal");
  const defaultAddress = initialData.addresses?.find(a => a.is_default) || initialData.addresses?.[0];

  const form = useForm<AddressValues>({
    resolver: zodResolver(getAddressSchema(t)),
    defaultValues: {
      address_1: defaultAddress?.address_1 || "",
      address_2: defaultAddress?.address_2 || "",
      city: defaultAddress?.city || "",
      state: defaultAddress?.state || "",
      zip_code: defaultAddress?.zip_code || "",
      country: defaultAddress?.country || "",
    },
  });

  const onSubmit = async (data: AddressValues) => {
    const res = await updateProfileAddress(data);
    
    if (res && !res.success) {
      toast.error("Error", { description: res.error || "Failed to update address" });
    }
  };

  const isSaving = form.formState.isSubmitting;

  return (
    <section>
      <header className="mb-15">
        <h2 className="text-2xl font-semibold tracking-tight mb-1">{tUI("editAddress.title")}</h2>
        <p className="text-muted-foreground text-sm">{tUI("editAddress.desc")}</p>
      </header>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="address_1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tUI("editAddress.addr1")}</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="address-line1" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address_2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tUI("editAddress.addr2")}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} autoComplete="address-line2" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tUI("editAddress.city")}</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="address-level2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tUI("editAddress.state")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} autoComplete="address-level1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tUI("editAddress.zip")}</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="postal-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tUI("editAddress.country")}</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="country-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-3 mt-10">
            <Link href="/profile" className={buttonVariants({ variant: "ghost", className: "h-9" })}>
              {tUI("editAddress.cancel")}
            </Link>
            <Button type="submit" disabled={isSaving} className={buttonVariants({ className: "h-9" })}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {tUI("editAddress.save")}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
