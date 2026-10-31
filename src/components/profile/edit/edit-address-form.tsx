"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfileAddress } from "@/actions/profile/personal-info.actions";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getAddressSchema, AddressValues } from "@/schema/profile.schema";
import { DBAddress } from "@/types/user.types";
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

export interface EditAddressFormProps {
  initialData: {
    addresses?: DBAddress[];
  };
  locale?: Locale;
  schemaDict: Dictionary<"schema_profile">;
  personalDict: Dictionary<"profile_personal">["editAddress"];
}

export function EditAddressForm({
  initialData,
  locale = defaultLocale,
  schemaDict,
  personalDict,
}: EditAddressFormProps) {
  const defaultAddress = initialData.addresses?.find(a => a.is_default) || initialData.addresses?.[0];

  const form = useForm<AddressValues>({
    resolver: zodResolver(getAddressSchema(schemaDict)),
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
    const res = await updateProfileAddress(data, locale);
    
    if (res && !res.success) {
      toast.error("Error", { description: res.error || "Failed to update address" });
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
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="address_1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{personalDict.addr1}</FormLabel>
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
                  <FormLabel>{personalDict.addr2}</FormLabel>
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
                    <FormLabel>{personalDict.city}</FormLabel>
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
                    <FormLabel>{personalDict.state}</FormLabel>
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
                    <FormLabel>{personalDict.zip}</FormLabel>
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
                    <FormLabel>{personalDict.country}</FormLabel>
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
