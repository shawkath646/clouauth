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
    <section className="py-24 md:py-32 relative">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1, transitionEnd: { transform: "none" } }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-primary/5 border rounded-3xl p-10 md:p-16 text-center max-w-4xl mx-auto"
        >
          {isLoggedIn ? (
            <>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                {t('callToAction.loggedIn.title')} <BrandName /> {t('callToAction.loggedIn.titleSuffix')}
              </h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
                {t('callToAction.loggedIn.description')}
              </p>
              <div className="flex justify-center">
                <Button render={<Link href="/profile" />} nativeButton={false} size="lg" className="h-12 px-8 text-base shadow-sm">
                  {t('callToAction.loggedIn.button')}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                {t('callToAction.loggedOut.title')}
              </h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
                {t('callToAction.loggedOut.descriptionPart1')} <BrandName /> {t('callToAction.loggedOut.descriptionPart2')}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button render={<Link href="/signup" />} nativeButton={false} size="lg" className="h-12 px-8 text-base shadow-sm">
                  {t('callToAction.loggedOut.createAccount')}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button render={<Link href="/signin" />} nativeButton={false} size="lg" variant="outline" className="h-12 px-8 text-base bg-background">
                  {t('callToAction.loggedOut.signIn')}
                </Button>
                <Button render={<Link href="/docs" />} nativeButton={false} size="lg" variant="ghost" className="h-12 px-8 text-base">
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
