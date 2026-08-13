"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UserCog, MonitorSmartphone, ShieldPlus, Key, Fingerprint, Code2 } from "lucide-react";
import { useTranslations } from "@/lib/i18n/hooks";

const capabilitiesKeys = [
  { icon: UserCog, key: "accountManagement" },
  { icon: MonitorSmartphone, key: "sessionManagement" },
  { icon: ShieldPlus, key: "mfa" },
  { icon: Key, key: "oauth" },
  { icon: Code2, key: "oidc" },
  { icon: Fingerprint, key: "passkey" }
];


export function FeatureGrid() {
  const { t } = useTranslations("landing");

  return (
    <section className="py-20 md:py-32" id="features">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{t('featureGrid.title')}</h2>
            <p className="text-lg text-muted-foreground">
              {t('featureGrid.description')}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {capabilitiesKeys.map((feat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
            >
              <Card className="h-full border-muted/60 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="mb-4">
                    <feat.icon className="w-6 h-6 text-foreground/80" />
                  </div>
                  <CardTitle className="text-xl">{t(`featureGrid.capabilities.${feat.key}.title`)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {t(`featureGrid.capabilities.${feat.key}.description`)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
