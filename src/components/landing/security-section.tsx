"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Network, LockKeyhole, UserCheck } from "lucide-react";
import type { Dictionary } from "@/types/i18n.types";

const securityFeaturesKeys = [
  { icon: LockKeyhole, key: "encryptedComm" },
  { icon: Network, key: "sessionProtection" },
  { icon: UserCheck, key: "identityVerification" },
  { icon: ShieldCheck, key: "modernArchitecture" }
] as const;

export interface SecuritySectionProps {
  dict: Dictionary<"landing">["securitySection"];
}

export function SecuritySection({ dict }: SecuritySectionProps) {
  return (
    <section className="py-20 md:py-32" id="security">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0, transitionEnd: { transform: "none" } }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:w-1/2"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              {dict.title}
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              {dict.description}
            </p>

            <div className="space-y-6">
              {securityFeaturesKeys.map((feature, idx) => {
                const featData = dict.features[feature.key];
                return (
                  <div key={idx} className="flex gap-4">
                    <div className="shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <feature.icon className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{featData.title}</h3>
                      <p className="text-muted-foreground">{featData.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0, transitionEnd: { transform: "none" } }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:w-1/2"
          >
            <div className="relative rounded-2xl border bg-muted/20 p-8 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <span className="font-mono text-xs text-muted-foreground">TLS 1.3 / Strict-Transport-Security</span>
                  <span className="text-xs text-emerald-500 font-medium">Enforced</span>
                </div>
                <div className="flex items-center justify-between border-b pb-4">
                  <span className="font-mono text-xs text-muted-foreground">OIDC Discovery (RFC 8414)</span>
                  <span className="text-xs text-emerald-500 font-medium">Active</span>
                </div>
                <div className="flex items-center justify-between border-b pb-4">
                  <span className="font-mono text-xs text-muted-foreground">PKCE Code Challenge (S256)</span>
                  <span className="text-xs text-emerald-500 font-medium">Mandatory</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">Token Rotation & Replay Protection</span>
                  <span className="text-xs text-emerald-500 font-medium">Enabled</span>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
