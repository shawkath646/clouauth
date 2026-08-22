"use client";

import { useState } from "react";
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
import SocialProviders from "@/components/social-providers";
import { motion } from "framer-motion";
import { useTranslations } from "@/lib/i18n/hooks";
import { signIn, SignInReturn } from "@/actions/auth/auth.actions";
import { continueWithProvider } from "@/actions/oauth/oauth.actions";
import { handleError } from "@/utils/error";
import { BrandName } from "@/components/ui/brand-name";

interface CredentialsStepProps {
  onNext: (result: SignInReturn) => void;
}

export default function CredentialsStep({ onNext }: CredentialsStepProps) {
  const { t } = useTranslations("signin");
  const { t: tCommon } = useTranslations("common");
  const { t: tSchema } = useTranslations("schema_auth");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<z.input<ReturnType<typeof getSignInSchema>>>({
    resolver: zodResolver(getSignInSchema(tSchema)),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: true,
    },
  });

  async function onSubmit(data: z.input<ReturnType<typeof getSignInSchema>>) {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await signIn(data as SignInValues);
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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">{t('title')}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">{t('subtitle')} <BrandName className="text-primary font-semibold" /> {t('account')}</p>
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
                <FormLabel>{t('usernameLabel')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('usernamePlaceholder')} autoComplete="username" {...field} />
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
                  <FormLabel>{t('passwordLabel')}</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={t('passwordPlaceholder')}
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
                        {t('keepLoggedIn')}
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                {t('forgotPassword')}
              </Link>
            </div>
          </div>

          <Button type="submit" className="w-full h-9 text-base" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              t('submitBtn')
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-5 text-center">
        <div className="flex items-center w-full mb-6">
          <div className="flex-1 border-t"></div>
          <span className="px-2 text-xs uppercase text-muted-foreground bg-transparent">
            {tCommon('orContinueWith')}
          </span>
          <div className="flex-1 border-t"></div>
        </div>

        <SocialProviders
          onClick={async (p) => {
            setIsLoading(true);
            try {
              await continueWithProvider(p);
            } catch (e: unknown) {
              const em = handleError(e, true);
              setIsLoading(false);
              setErrorMsg(em);
            }
          }}
          isLoading={isLoading}
        />

        <p className="mt-6 text-sm text-muted-foreground">
          {t('noAccount')}{" "}
          <Link
            href="/signup"
            className="font-medium text-primary hover:underline"
          >
            {t('createAccount')}
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
