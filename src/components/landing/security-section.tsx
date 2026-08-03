"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Network, LockKeyhole, UserCheck } from "lucide-react";

const securityFeatures = [
  {
    icon: LockKeyhole,
    title: "Encrypted Communication",
    description: "End-to-end encryption and strict HTTPS enforcement ensure your data is secure in transit."
  },
  {
    icon: Network,
    title: "Session Protection",
    description: "Advanced heuristics and device fingerprinting to detect and prevent unauthorized session hijacking."
  },
  {
    icon: UserCheck,
    title: "Identity Verification",
    description: "Robust email verification, recovery flows, and account protection mechanisms."
  },
  {
    icon: ShieldCheck,
    title: "Modern Architecture",
    description: "Built on battle-tested standards and privacy-first architectural patterns."
  }
];

export function SecuritySection() {
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
              Security Without Compromise
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              We focus on building trust through transparent, industry-standard security implementations. Clou Auth protects your users so you can focus on building your application.
            </p>

            <div className="space-y-6">
              {securityFeatures.map((feature, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1, transitionEnd: { transform: "none" } }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:w-1/2 w-full relative"
          >
            <div className="aspect-square max-w-md mx-auto relative rounded-3xl overflow-hidden border bg-muted/20 flex items-center justify-center">
              {/* Abstract Security Graphic */}
              <div className="absolute inset-0 bg-grid-black/[0.05] dark:bg-grid-white/[0.05] bg-[bottom_1px_center]" />
              <div className="relative z-10 flex flex-col items-center">
                <ShieldCheck className="w-32 h-32 text-primary/80 mb-6" strokeWidth={1} />
                <div className="bg-background border rounded-xl p-4 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium">System Status: Secure</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
