"use client";

import { motion } from "framer-motion";
import { Globe2 } from "lucide-react";
import { BrandName } from "@/components/ui/brand-name";
import type { Dictionary } from "@/types/i18n.types";

export interface FutureVisionProps {
  dict: Dictionary<"landing">["futureVision"];
}

export function FutureVision({ dict }: FutureVisionProps) {
  return (
    <section className="py-24 bg-zinc-950 text-white dark:bg-background relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <Globe2 className="w-200 h-200" strokeWidth={0.5} />
      </div>

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">
              {dict.titleLine1}<br />
              {dict.titleLine2}
            </h2>
            
            <p className="text-xl text-zinc-400 dark:text-muted-foreground leading-relaxed">
              <BrandName /> {dict.descriptionPart1} <BrandName /> {dict.descriptionPart2}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
