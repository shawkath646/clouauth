"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export function ProfileSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/10 dark:border-primary/10 rounded-xl overflow-hidden shadow-none space-y-0"
    >
      <div className="px-5 py-4 sm:px-6 sm:py-4 border-b border-border/50">
        <Skeleton className="h-6 w-1/3 max-w-[200px] mb-2" />
        <Skeleton className="h-4 w-1/2 max-w-[300px]" />
      </div>
      <div className="flex flex-col sm:flex-row justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
      <div className="px-6 sm:px-8">
        <Skeleton className="h-[1px] w-full opacity-50" />
      </div>
      <div className="flex flex-col sm:flex-row justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
      <div className="px-6 sm:px-8">
        <Skeleton className="h-[1px] w-full opacity-50" />
      </div>
      <div className="flex flex-col sm:flex-row justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
    </motion.div>
  );
}
