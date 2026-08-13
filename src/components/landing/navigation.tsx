"use client";

import Link from "next/link";
import Image from "next/image"; // Re-added the missing import
import { Shield, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useTranslations } from "@/lib/i18n/hooks";

// Restored your imports!
import iconLight from "@/assets/icon_light.png";
import iconDark from "@/assets/icon_dark.png";

export function Navigation() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslations("landing");
  
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transitionEnd: { transform: "none" } }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md"
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left Section */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary/10 p-1.5 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold tracking-tight text-lg">ClouAuth</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/developers" className="hover:text-foreground transition-colors">{t('navigation.developers')}</Link>
            <Link href="/docs" className="hover:text-foreground transition-colors">{t('navigation.documentation')}</Link>
          </nav>
        </div>

        {/* Right Section: The fixed icons with proper dark/light theme switching */}
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label={t('navigation.toggleTheme')}
          >
            <Sun className="h-4 w-4 hidden dark:block" />
            <Moon className="h-4 w-4 block dark:hidden" />
          </button>
          
          <div className="hidden sm:block">
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

      </div>
    </motion.header>
  );
}