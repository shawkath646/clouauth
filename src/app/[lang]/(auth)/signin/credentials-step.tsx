"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSignInSchema, type SignInValues } from "@/schema/auth.schema";
import { z } from "zod";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SocialProviders from "@/components/social-providers";
import { motion } from "framer-motion";
import { signIn, SignInReturn } from "@/actions/auth/auth.actions";
import { continueWithProvider } from "@/actions/oauth/oauth.actions";
import { handleError } from "@/utils/error";
import { BrandName } from "@/components/ui/brand-name";
import { useReCaptcha } from "@/lib/recaptcha/client";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/types/i18n.types";
import { AUTH_REQUEST_PARAM } from "@/constants/oauth.constants";

interface CredentialsStepProps {
  onNext: (result: SignInReturn) => void;
  authRequest?: string | null;
  locale?: Locale;
  dict: Dictionary<"signin">;
  commonDict: Dictionary<"common">;
  schemaDict: Dictionary<"schema_auth">;
}

export default function CredentialsStep({
  onNext,
  authRequest = null,
  locale = defaultLocale,
  dict,
  commonDict,
  schemaDict,
}: CredentialsStepProps) {
  const searchParams = useSearchParams();
  const effectiveAuthRequest = authRequest || searchParams.get(AUTH_REQUEST_PARAM);
  const returnTo = effectiveAuthRequest
    ? `/${locale}/consent?${AUTH_REQUEST_PARAM}=${encodeURIComponent(effectiveAuthRequest)}`
    : searchParams.get("return_to");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { executeRecaptcha } = useReCaptcha();

  const signInSchema = useMemo(() => getSignInSchema(schemaDict), [schemaDict]);

  const form = useForm<z.input<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: true,
    },
  });

  async function onSubmit(data: z.input<typeof signInSchema>) {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const recaptchaToken = await executeRecaptcha("signin");
      const response = await signIn(data as SignInValues, recaptchaToken ?? undefined);
      if (response && response.action === "ERROR") {
        setErrorMsg(response.error ?? "Invalid credentials");
      } else {
        onNext(response);
      }
    } catch (e: unknown) {
      const em = handleError(e, true);
      setErrorMsg(em);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <motion.div
      key="credentials"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md p-5 sm:p-8 md:p-10 bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 shadow-2xl rounded-3xl flex flex-col mx-auto"
    >
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">{dict.title}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">{dict.subtitle} <BrandName className="text-primary font-semibold" /> {dict.account}</p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
          {errorMsg}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.usernameLabel}</FormLabel>
                <FormControl>
                  <Input placeholder={dict.usernamePlaceholder} autoComplete="username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-1">
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
                        autoComplete="current-password"
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

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal cursor-pointer text-muted-foreground">
                        {dict.keepLoggedIn}
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <Link
                href={`/${locale}/forgot-password`}
                className="text-xs font-medium text-primary hover:underline"
              >
                {dict.forgotPassword}
              </Link>
            </div>
          </div>

          <Button type="submit" className="w-full h-9 text-base" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              dict.submitBtn
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-5 text-center">
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
              const em = handleError(e, true);
              setIsLoading(false);
              setErrorMsg(em);
            }
          }}
          isLoading={isLoading}
        />

        <p className="mt-6 text-sm text-muted-foreground">
          {dict.noAccount}{" "}
          <Link
            href={
              effectiveAuthRequest
                ? `/${locale}/signup?${AUTH_REQUEST_PARAM}=${encodeURIComponent(effectiveAuthRequest)}`
                : `/${locale}/signup`
            }
            className="font-medium text-primary hover:underline"
          >
            {dict.createAccount}
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
