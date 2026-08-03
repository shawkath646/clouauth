"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, LayoutGrid, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export function Hero() {
  const signedIn = false; // Mocked state as requested

  return (
    <section className="relative overflow-hidden pt-24 md:pt-32 pb-16 md:pb-24">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[bottom_1px_center] pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute top-1/2 -left-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 mb-6 text-primary font-medium text-sm tracking-wide uppercase"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>The Identity Platform for CloudBurstLab</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
          >
            One account.<br className="hidden sm:block" />
            <span className="text-muted-foreground">Every CloudBurst service.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed"
          >
            Secure authentication and identity management for CloudBurstLab, with OAuth 2.0 and OpenID Connect support for modern applications.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            {signedIn ? (
              <Button render={<Link href="/profile" />} nativeButton={false} size="lg" className="h-12 px-8 text-base shadow-sm">
                Manage Account
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            ) : (
              <>
                <Button render={<Link href="/signup" />} nativeButton={false} size="lg" className="h-12 px-8 text-base shadow-sm">
                  Create Account
                </Button>
                <Button render={<Link href="/signin" />} nativeButton={false} size="lg" variant="outline" className="h-12 px-8 text-base">
                  Sign In
                </Button>
              </>
            )}
            
            {/* FIXED BUTTON STYLING */}
            <Button 
              render={<Link href="#" />} 
              nativeButton={false} 
              size="lg" 
              variant="secondary" 
              className="h-12 px-6 text-base hidden sm:inline-flex group"
            >
              <LayoutGrid className="mr-2 w-4 h-4 transition-transform duration-200 group-hover:scale-110 text-primary" />
              View Apps & Services
            </Button>

          </motion.div>
        </div>
      </div>
    </section>
  );
}