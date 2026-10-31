"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSignUpSchema, type SignUpValues } from "@/schema/auth.schema";
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
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import SignUpPromotion from "./signup-promotion";
import { signUp } from "@/actions/auth/signup.actions";
import { continueWithProvider } from "@/actions/oauth/oauth.actions";
import SocialProviders from "@/components/social-providers";
import { handleError } from "@/utils/error";
import { useReCaptcha } from "@/lib/recaptcha/client";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/types/i18n.types";

export interface SignUpFormProps {
  locale?: Locale;
  dict: Dictionary<"signup">;
  commonDict: Dictionary<"common">;
  schemaDict: Dictionary<"schema_auth">;
}

export default function SignUpForm({
  locale = defaultLocale,
  dict,
  commonDict,
  schemaDict,
}: SignUpFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return_to");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { executeRecaptcha } = useReCaptcha();

  const form = useForm<SignUpValues>({
    resolver: zodResolver(getSignUpSchema(schemaDict)),
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
      const recaptchaToken = await executeRecaptcha("signup");
      const response = await signUp(data, recaptchaToken ?? undefined);
      if (response.success) {
        router.push(response.redirectUrl || `/${locale}/profile`);
      } else {
        setErrorMsg(response.error || "Failed to create account.");
      }
    } catch (e: unknown) {
      const em = handleError(e, "Failed to execute onSubmit");
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
      <SignUpPromotion dict={dict} />

      <div className="flex-1 p-6 sm:p-10 md:p-12 flex flex-col justify-center">
        <div className="text-left mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{dict.title}</h1>
          <p className="text-sm text-muted-foreground">{dict.subtitle}</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
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
                    <FormLabel>{dict.firstNameLabel}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={dict.firstNamePlaceholder}
                        autoComplete="given-name"
                        {...field}
                      />
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
                    <FormLabel>{dict.lastNameLabel}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={dict.lastNamePlaceholder}
                        autoComplete="family-name"
                        {...field}
                      />
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
                  <FormLabel>{dict.emailLabel}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={dict.emailPlaceholder}
                      autoComplete="email"
                      {...field}
                    />
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
                  <FormLabel>{dict.passwordLabel}</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={dict.passwordPlaceholder}
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

            <Button
              type="submit"
              className="w-full h-11 text-base mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                dict.submitBtn
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <div className="flex items-center w-full mb-6">
            <div className="flex-1 border-t"></div>
            <span className="px-2 text-xs uppercase text-muted-foreground bg-transparent">
              {commonDict.orContinueWith}
            </span>
            <div className="flex-1 border-t"></div>
          </div>

          <SocialProviders
            onClick={async (p) => {
              setIsLoading(true);
              try {
                await continueWithProvider(p, returnTo);
              } catch (e: unknown) {
                const em = handleError(e, "Failed to execute SignUpForm");
                setIsLoading(false);
                setErrorMsg(em);
              }
            }}
            isLoading={isLoading}
          />

          <p className="mt-6 text-sm text-muted-foreground">
            {dict.alreadyHaveAccount}{" "}
            <Link
              href={`/${locale}/signin`}
              className="font-medium text-primary hover:underline"
            >
              {dict.signIn}
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
