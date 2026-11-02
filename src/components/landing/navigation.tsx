"use client";

import Link from "next/link";
import Image from "next/image";
import { Shield, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { updateProfilePreferences } from "@/actions/profile/personal-info.actions";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/types/i18n.types";
import iconLight from "@/assets/icon_light.png";
import iconDark from "@/assets/icon_dark.png";

export interface NavigationProps {
  locale?: Locale;
  dict: Dictionary<"landing">["navigation"];
}

export function Navigation({ locale = defaultLocale, dict }: NavigationProps) {
  const { setTheme } = useTheme();
  
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    document.cookie = `theme=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `theme_pref=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;
    updateProfilePreferences({ theme: nextTheme }).catch(() => {});
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
          <Link href={`/${locale}`} className="flex items-center gap-2 group">
            <div className="bg-primary/10 p-1.5 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold tracking-tight text-lg">ClouAuth</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href={`/${locale}/developers`} className="hover:text-foreground transition-colors">
              {dict.developers}
            </Link>
            <Link href={`/${locale}/docs`} className="hover:text-foreground transition-colors">
              {dict.documentation}
            </Link>
          </nav>
        </div>

        {/* Right Section: The fixed icons with proper dark/light theme switching */}
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label={dict.toggleTheme}
          >
            <Sun className="h-4 w-4 hidden dark:block" />
            <Moon className="h-4 w-4 block dark:hidden" />
          </button>
          
          <div className="hidden sm:block">
            <Image 
              src={iconDark} 
              alt="Logo" 
              priority 
              className="hidden dark:block w-36 h-auto object-contain" 
            />
            <Image 
              src={iconLight} 
              alt="Logo" 
              priority 
              className="block dark:hidden w-36 h-auto object-contain" 
            />
          </div>
        </div>

      </div>
    </motion.header>
  );
}
