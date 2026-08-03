"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from "react";
import { SectionCard } from "@/components/profile/section-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/misc/utils";
import { Separator } from "@/components/ui/separator";
import type { FullProfile } from "@/types/profile.types";

export function PreferencesSection({ profile }: { profile: FullProfile }) {
  const [theme, setTheme] = useState<"light" | "dark" | "system">(profile.preferences?.theme || "system");
  
  useEffect(() => {
    // Check initial state
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.theme === 'dark') {
      setTheme('dark');
    } else if (localStorage.theme === 'light') {
      setTheme('light');
    } else if (profile.preferences?.theme) {
      setTheme(profile.preferences.theme);
    } else {
      setTheme('system');
    }
  }, [profile.preferences?.theme]);

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else if (newTheme === "light") {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    } else {
      localStorage.removeItem('theme');
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Appearance" description="Customize how CloudburstLab looks for you.">
        <div className="flex gap-3">
          <button 
            onClick={() => handleThemeChange("light")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 flex-1 rounded-xl border transition-all cursor-pointer",
              theme === "light" 
                ? "bg-primary/10 text-primary border-primary/20" 
                : "border-border/50 text-muted-foreground hover:bg-muted/10 hover:text-foreground"
            )}
          >
            <Sun className="h-5 w-5" />
            <span className="text-sm font-medium">Light</span>
          </button>
          
          <button 
            onClick={() => handleThemeChange("dark")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 flex-1 rounded-xl border transition-all cursor-pointer",
              theme === "dark" 
                ? "bg-primary/10 text-primary border-primary/20" 
                : "border-border/50 text-muted-foreground hover:bg-muted/10 hover:text-foreground"
            )}
          >
            <Moon className="h-5 w-5" />
            <span className="text-sm font-medium">Dark</span>
          </button>
          
          <button 
            onClick={() => handleThemeChange("system")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 flex-1 rounded-xl border transition-all cursor-pointer",
              theme === "system" 
                ? "bg-primary/10 text-primary border-primary/20" 
                : "border-border/50 text-muted-foreground hover:bg-muted/10 hover:text-foreground"
            )}
          >
            <Monitor className="h-5 w-5" />
            <span className="text-sm font-medium">System</span>
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Language & Region" description="Set your preferred language and regional settings." noPadding>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Language</h4>
            <p className="text-base font-semibold">Select your language</p>
          </div>
          <Select defaultValue={profile.preferences?.language || "en"}>
            <SelectTrigger className="w-full sm:w-48 bg-background/50 rounded-xl">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-background/90 backdrop-blur-xl border-primary/20">
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="bn">বাংলা</SelectItem>
              <SelectItem value="ko">한국어</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator className="opacity-50" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Timezone</h4>
            <p className="text-base font-semibold">Select your local time</p>
          </div>
          <Select defaultValue={profile.preferences?.timezone || "UTC"}>
            <SelectTrigger className="w-full sm:w-48 bg-background/50 rounded-xl">
              <SelectValue placeholder="Select Timezone" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-background/90 backdrop-blur-xl border-primary/20">
              <SelectItem value="UTC">(UTC+00:00) UTC</SelectItem>
              <SelectItem value="pst">(UTC-08:00) Pacific Time</SelectItem>
              <SelectItem value="est">(UTC-05:00) Eastern Time</SelectItem>
              <SelectItem value="gmt">(UTC+00:00) GMT</SelectItem>
              <SelectItem value="jst">(UTC+09:00) JST</SelectItem>
              <SelectItem value="ist">(UTC+05:30) IST</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator className="opacity-50" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Date Format</h4>
            <p className="text-base font-semibold">How dates are displayed</p>
          </div>
          <Select defaultValue="mm-dd-yyyy">
            <SelectTrigger className="w-full sm:w-48 bg-background/50 rounded-xl">
              <SelectValue placeholder="Select Format" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-background/90 backdrop-blur-xl border-primary/20">
              <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
              <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
              <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>
    </div>
  );
}
