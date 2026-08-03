"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpValues } from "@/schema/auth.schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "@/lib/i18n/hooks";
import SignUpPromotion from "./signup-promotion";
import { signUp } from "@/actions/auth/signup.actions";
import { continueWithProvider } from "@/actions/oauth/oauth.actions";
import SocialProviders from "@/components/social-providers";
import { getErrorMessage } from "@/misc/utils";

export default function SignUpForm() {
  const router = useRouter();
  const { t } = useTranslations("signup");
  const { t: tCommon } = useTranslations("common");
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: SignUpValues) {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await signUp(data);
      if (response.success) {
        router.push(response.redirectUrl || "/dashboard");
      } else {
        setErrorMsg(response.error || "Failed to create account.");
      }
    } catch (e: unknown) {
      const em = getErrorMessage(e);
      setErrorMsg(em);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-5xl bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 shadow-2xl rounded-3xl overflow-hidden flex flex-col md:flex-row mx-auto"
    >
      <SignUpPromotion />

      <div className="w-full md:w-7/12 p-5 sm:p-8 md:p-10 flex flex-col justify-center">
        <div className="text-center md:text-left mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2">{t("title")}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t("subtitle")}</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
            {errorMsg}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("firstNameLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("firstNamePlaceholder")} autoComplete="given-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("lastNameLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("lastNamePlaceholder")} autoComplete="family-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>



            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("emailLabel")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("emailPlaceholder")} autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("passwordLabel")}</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={t("passwordPlaceholder")}
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">Toggle password visibility</span>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                t("submitBtn")
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <div className="flex items-center w-full mb-6">
            <div className="flex-1 border-t"></div>
            <span className="px-2 text-xs uppercase text-muted-foreground bg-transparent">
              {tCommon("orContinueWith")}
            </span>
            <div className="flex-1 border-t"></div>
          </div>

          <SocialProviders 
            onClick={async (p) => {
              setIsLoading(true);
              try {
                await continueWithProvider(p);
              } catch (e: unknown) {
                const em = getErrorMessage(e);
                setIsLoading(false);
                setErrorMsg(em);
              }
            }} 
            isLoading={isLoading}
          />

          <p className="mt-6 text-sm text-muted-foreground">
            {t("alreadyHaveAccount")}{" "}
            <Link
              href="/signin"
              className="font-medium text-primary hover:underline"
            >
              {t("signIn")}
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}