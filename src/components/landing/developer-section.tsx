"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Terminal, Code, Blocks, ArrowRight } from "lucide-react";
import { useTranslations } from "@/lib/i18n/hooks";

export function DeveloperSection() {
  const { t } = useTranslations("landing");

  return (
    <section className="py-20 md:py-32 bg-zinc-950 text-zinc-50 dark:bg-muted/20 relative overflow-hidden" id="developers">
      {/* Decorative gradient for developer section */}
      <div className="absolute top-0 right-0 w-125 h-125 bg-primary/10 rounded-full blur-[100px] pointer-events-none opacity-50 translate-x-1/3 -translate-y-1/3" />
      
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0, transitionEnd: { transform: "none" } }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/50 dark:bg-muted border border-zinc-700/50 dark:border-border text-sm font-medium text-zinc-300 dark:text-muted-foreground mb-6">
              <Terminal className="w-4 h-4" />
              <span>{t('developerSection.badge')}</span>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-white dark:text-foreground">
              {t('developerSection.title')}
            </h2>
            
            <p className="text-lg text-zinc-400 dark:text-muted-foreground mb-8 leading-relaxed">
              {t('developerSection.description')}
            </p>

            <ul className="space-y-4 mb-10">
              <li className="flex items-start gap-3">
                <div className="mt-1 bg-primary/20 p-1 rounded">
                  <Code className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <strong className="text-zinc-200 dark:text-foreground block">{t('developerSection.features.oauthOidc.title')}</strong>
                  <span className="text-zinc-400 dark:text-muted-foreground text-sm">{t('developerSection.features.oauthOidc.description')}</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 bg-primary/20 p-1 rounded">
                  <Blocks className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <strong className="text-zinc-200 dark:text-foreground block">{t('developerSection.features.apiSupport.title')}</strong>
                  <span className="text-zinc-400 dark:text-muted-foreground text-sm">{t('developerSection.features.apiSupport.description')}</span>
                </div>
              </li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button render={<Link href="/developers" />} nativeButton={false} size="lg" className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                {t('developerSection.developerGuide')}
              </Button>
              <Button render={<Link href="/docs" />} nativeButton={false} size="lg" variant="outline" className="h-12 border-zinc-700 hover:bg-zinc-800 text-zinc-300 dark:border-border dark:hover:bg-muted dark:text-foreground">
                {t('developerSection.apiReference')}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </motion.div>

          {/* Code snippet visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1, transitionEnd: { transform: "none" } }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-xl border border-zinc-800 dark:border-border bg-zinc-900/50 dark:bg-background/50 backdrop-blur-sm p-4 md:p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-zinc-800 dark:border-border">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-2 text-xs font-mono text-zinc-500">oauth-config.ts</span>
            </div>
            <pre className="text-sm font-mono text-zinc-300 overflow-x-auto">
              <code className="block mb-2"><span className="text-primary/80">import</span> {'{'} ClouAuth {'}'} <span className="text-primary/80">from</span> <span className="text-green-400">&apos;@cloudburst/auth&apos;</span>;</code>
              <code className="block mb-2 text-zinc-500">{'// Initialize the SDK'}</code>
              <code className="block mb-2"><span className="text-primary/80">const</span> auth = <span className="text-primary/80">new</span> ClouAuth({'{'}</code>
              <code className="block mb-1 pl-4">clientId: process.env.<span className="text-blue-400">CLOU_CLIENT_ID</span>,</code>
              <code className="block mb-1 pl-4">clientSecret: process.env.<span className="text-blue-400">CLOU_CLIENT_SECRET</span>,</code>
              <code className="block mb-1 pl-4">issuer: <span className="text-green-400">&apos;https://auth.clouburstlab.com&apos;</span>,</code>
              <code className="block mb-2">{'}'});</code>
              <code className="block mb-2 text-zinc-500">{'// Protect your routes'}</code>
              <code className="block mb-1"><span className="text-primary/80">export</span> <span className="text-primary/80">const</span> middleware = auth.requireSession();</code>
            </pre>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
