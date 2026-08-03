"use client";

import Link from "next/link";
import Image from "next/image"; // Re-added the missing import
import { Shield } from "lucide-react";
import { motion } from "framer-motion";

// Restored your imports!
import iconLight from "@/assets/icon_light.png";
import iconDark from "@/assets/icon_dark.png";

export function Navigation() {
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transitionEnd: { transform: "none" } }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md"
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left Section: Your original Shield Icon + Nav Links left exactly as-is */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary/10 p-1.5 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold tracking-tight text-lg">Clou Auth</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="#developers" className="hover:text-foreground transition-colors">Developers</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Documentation</Link>
          </nav>
        </div>

        {/* Right Section: The fixed icons with proper dark/light theme switching */}
        <div className="flex items-center">
          <Image 
            src={iconDark} 
            alt="Logo" 
            width={144} 
            height={40} 
            priority 
            className="hidden dark:block object-contain" 
          />
          <Image 
            src={iconLight} 
            alt="Logo" 
            width={144} 
            height={40} 
            priority 
            className="block dark:hidden object-contain" 
          />
        </div>

      </div>
    </motion.header>
  );
}