"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Fingerprint, Zap, ShieldAlert } from "lucide-react";
import { useTranslations } from "@/lib/i18n/hooks";

const trustFeaturesKeys = [
  { icon: Lock, key: "secureByDesign" },
  { icon: Fingerprint, key: "unifiedIdentity" },
  { icon: Zap, key: "fastAuth" },
  { icon: ShieldAlert, key: "privacyFocused" }
];


const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 }, transitionEnd: { transform: "none" } }
};

export function TrustSection() {
  const { t } = useTranslations("landing");

  return (
    <section className="py-16 md:py-24 bg-muted/30" id="trust">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">{t('trustSection.title')}</h2>
          <p className="text-muted-foreground">
            {t('trustSection.description')}
          </p>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {trustFeaturesKeys.map((feature, idx) => (
            <motion.div key={idx} variants={item}>
              <Card className="h-full bg-background border-muted/50 hover:border-primary/20 transition-colors shadow-sm">
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{t(`trustSection.features.${feature.key}.title`)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`trustSection.features.${feature.key}.description`)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
