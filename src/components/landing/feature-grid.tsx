"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UserCog, MonitorSmartphone, ShieldPlus, Key, Fingerprint, Code2 } from "lucide-react";

const capabilities = [
  {
    icon: UserCog,
    title: "Account Management",
    description: "Manage your identity, profile, preferences, and security settings from a centralized hub."
  },
  {
    icon: MonitorSmartphone,
    title: "Session Management",
    description: "Review and manage active sessions across all your trusted devices in real-time."
  },
  {
    icon: ShieldPlus,
    title: "Multi-Factor Authentication",
    description: "Additional layers of protection for sensitive accounts using industry-standard 2FA methods."
  },
  {
    icon: Key,
    title: "OAuth 2.0 Integration",
    description: "Allow third-party applications to securely authenticate users through the Clou Auth platform."
  },
  {
    icon: Code2,
    title: "OpenID Connect",
    description: "A modern, standard identity layer built on top of OAuth 2.0 for robust application integration."
  },
  {
    icon: Fingerprint,
    title: "Future Passkey Support",
    description: "Preparing for the passwordless future using modern WebAuthn standards for ultimate security."
  }
];

export function FeatureGrid() {
  return (
    <section className="py-20 md:py-32" id="features">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Platform Capabilities</h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to manage your identity securely and integrate authentication into your own applications.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {capabilities.map((feat, idx) => (
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
                  <CardTitle className="text-xl">{feat.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {feat.description}
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
