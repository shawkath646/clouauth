"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, ArrowRight } from "lucide-react";

export function DocumentationSection() {
  return (
    <section className="py-20 bg-primary/5 border-y border-primary/10">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-center justify-between gap-8 bg-background border shadow-sm rounded-2xl p-8 md:p-12"
        >
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <BookOpen className="w-4 h-4" />
              <span>Comprehensive Guides</span>
            </div>
            
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Explore the Documentation
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8">
              Everything you need to integrate ClouAuth into your application, from OAuth flows to API references and step-by-step implementation guides.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button render={<Link href="#" />} nativeButton={false} size="lg" className="h-12 bg-primary/10 text-primary hover:bg-primary/20 shadow-none border border-primary/20">
                <FileText className="mr-2 w-4 h-4" />
                Read the Docs
              </Button>
              <Button render={<Link href="#" />} nativeButton={false} variant="ghost" size="lg" className="h-12 group">
                View GitHub Examples
                <ArrowRight className="ml-2 w-4 h-4 opacity-70 group-hover:translate-x-1 transition-all" />
              </Button>
            </div>
          </div>

          <div className="hidden lg:flex w-64 h-64 shrink-0 items-center justify-center relative">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-pulse" />
            <BookOpen className="w-32 h-32 text-primary/80 relative z-10" strokeWidth={1} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
