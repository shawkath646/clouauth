"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { BrandName } from "@/components/ui/brand-name";
import { useTranslations } from "@/lib/i18n/hooks";

export function CallToAction({ isLoggedIn }: { isLoggedIn?: boolean }) {
  const { t } = useTranslations("landing");

  return (
    <section className="py-10 sm:py-14 md:py-18 relative">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1, transitionEnd: { transform: "none" } }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="bg-primary/5 border rounded-2xl p-6 sm:p-8 md:p-10 text-center max-w-3xl mx-auto shadow-xs"
        >
          {isLoggedIn ? (
            <>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">
                {t('callToAction.loggedIn.title')} <BrandName /> {t('callToAction.loggedIn.titleSuffix')}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-xl mx-auto leading-relaxed">
                {t('callToAction.loggedIn.description')}
              </p>
              <div className="flex justify-center">
                <Button render={<Link href="/profile" />} nativeButton={false} size="default" className="h-10 px-6 text-sm shadow-xs">
                  {t('callToAction.loggedIn.button')}
                  <ArrowRight className="ml-1.5 w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">
                {t('callToAction.loggedOut.title')}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-xl mx-auto leading-relaxed">
                {t('callToAction.loggedOut.descriptionPart1')} <BrandName /> {t('callToAction.loggedOut.descriptionPart2')}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button render={<Link href="/signup" />} nativeButton={false} size="default" className="h-10 px-5 text-sm shadow-xs">
                  {t('callToAction.loggedOut.createAccount')}
                  <ArrowRight className="ml-1.5 w-4 h-4" />
                </Button>
                <Button render={<Link href="/signin" />} nativeButton={false} size="default" variant="outline" className="h-10 px-5 text-sm bg-background">
                  {t('callToAction.loggedOut.signIn')}
                </Button>
                <Button render={<Link href="/docs" />} nativeButton={false} size="default" variant="ghost" className="h-10 px-4 text-sm">
                  {t('callToAction.loggedOut.documentation')}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
