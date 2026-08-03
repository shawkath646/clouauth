"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Fingerprint, Zap, ShieldAlert } from "lucide-react";

const trustFeatures = [
  {
    icon: Lock,
    title: "Secure by Design",
    description: "Strong authentication with modern security practices to keep accounts safe from unauthorized access."
  },
  {
    icon: Fingerprint,
    title: "Unified Identity",
    description: "One account across all CloudBurst services. Simplify your digital life with a single, secure identity."
  },
  {
    icon: Zap,
    title: "Fast Authentication",
    description: "Quick, reliable, and seamless sign-in experiences built on high-performance infrastructure."
  },
  {
    icon: ShieldAlert,
    title: "Privacy Focused",
    description: "Your identity and account remain strictly under your control, with transparent data policies."
  }
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
  return (
    <section className="py-16 md:py-24 bg-muted/30" id="trust">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Trust at the Core</h2>
          <p className="text-muted-foreground">
            Clou Auth is built on a foundation of security, privacy, and seamless user experience, ensuring your identity is always protected.
          </p>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {trustFeatures.map((feature, idx) => (
            <motion.div key={idx} variants={item}>
              <Card className="h-full bg-background border-muted/50 hover:border-primary/20 transition-colors shadow-sm">
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
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
