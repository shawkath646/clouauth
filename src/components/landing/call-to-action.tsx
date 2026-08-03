"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CallToAction() {
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
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Ready to get started?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Create your secure identity today, or explore the documentation to learn how to integrate Clou Auth into your next project.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button render={<Link href="/signup" />} nativeButton={false} size="lg" className="h-12 px-8 text-base shadow-sm">
              Create Account
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button render={<Link href="/signin" />} nativeButton={false} size="lg" variant="outline" className="h-12 px-8 text-base bg-background">
              Sign In
            </Button>
            <Button render={<Link href="#" />} nativeButton={false} size="lg" variant="ghost" className="h-12 px-8 text-base">
              Documentation
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
