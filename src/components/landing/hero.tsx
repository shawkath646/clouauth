"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutGrid, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

import type { MinimalProfile } from "@/types/profile.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandName } from "@/components/ui/brand-name";
import { useTranslations } from "@/lib/i18n/hooks";

export function Hero({ profile }: { profile?: MinimalProfile | null }) {
  const { t } = useTranslations("landing");
  return (
    <section className="relative overflow-hidden pt-24 md:pt-32 pb-16 md:pb-24">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-position-[bottom_1px_center] pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute top-1/2 -left-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 mb-6 text-primary font-medium text-sm tracking-wide uppercase"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t('hero.subtitle')} <BrandName /></span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
          >
            {t('hero.titleLine1')}<br className="hidden sm:block" />
            <span className="text-muted-foreground">{t('hero.titleLine2')} <BrandName /> {t('hero.titleLine2Service')}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed"
          >
            {t('hero.description')} <BrandName />{t('hero.descriptionSuffix')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 items-center sm:items-stretch"
          >
            {!profile && (
              <>
                <Button render={<Link href="/signup" />} nativeButton={false} size="lg" className="h-12 px-8 text-base shadow-sm self-start">
                  {t('hero.createAccount')}
                </Button>
                <Button render={<Link href="/signin" />} nativeButton={false} size="lg" variant="outline" className="h-12 px-8 text-base self-start">
                  {t('hero.signIn')}
                </Button>
              </>
            )}

            {/* FIXED BUTTON STYLING */}
            <Button
              render={<Link href="https://clouburstlab.com/apps" />}
              nativeButton={false}
              size="lg"
              variant="secondary"
              className="h-12 px-6 text-base hidden sm:inline-flex group"
            >
              <LayoutGrid className="mr-2 w-4 h-4 transition-transform duration-200 group-hover:scale-110 text-primary" />
              {t('hero.viewApps')}
            </Button>

            {profile && (
              <Link href="/profile" className="flex items-center gap-3 hover:bg-muted/50 p-2 pr-6 rounded-full border bg-card transition-colors shadow-sm self-start">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile.avatar || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {profile.first_name?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold leading-none">
                    {profile.first_name} {profile.last_name}
                  </span>
                  <span className="text-xs text-muted-foreground leading-none mt-1">
                    @{profile.username}
                  </span>
                </div>
              </Link>
            )}

          </motion.div>
        </div>
      </div>
    </section>
  );
}