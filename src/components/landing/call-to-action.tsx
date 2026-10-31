"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { BrandName } from "@/components/ui/brand-name";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/types/i18n.types";

export interface CallToActionProps {
  isLoggedIn?: boolean;
  locale?: Locale;
  dict: Dictionary<"landing">["callToAction"];
}

export function CallToAction({
  isLoggedIn,
  locale = defaultLocale,
  dict,
}: CallToActionProps) {
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
                {dict.loggedIn.title} <BrandName /> {dict.loggedIn.titleSuffix}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-xl mx-auto leading-relaxed">
                {dict.loggedIn.description}
              </p>
              <div className="flex justify-center">
                <Button render={<Link href={`/${locale}/profile`} />} nativeButton={false} size="default" className="h-10 px-6 text-sm shadow-xs">
                  {dict.loggedIn.button}
                  <ArrowRight className="ml-1.5 w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">
                {dict.loggedOut.title}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-xl mx-auto leading-relaxed">
                {dict.loggedOut.descriptionPart1} <BrandName /> {dict.loggedOut.descriptionPart2}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button render={<Link href={`/${locale}/signup`} />} nativeButton={false} size="default" className="h-10 px-5 text-sm shadow-xs">
                  {dict.loggedOut.createAccount}
                  <ArrowRight className="ml-1.5 w-4 h-4" />
                </Button>
                <Button render={<Link href={`/${locale}/signin`} />} nativeButton={false} size="default" variant="outline" className="h-10 px-5 text-sm">
                  {dict.loggedOut.signIn}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
