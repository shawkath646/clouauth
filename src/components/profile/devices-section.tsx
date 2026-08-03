"use client";

import { SectionCard } from "@/components/profile/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MonitorSmartphone, Smartphone, Tablet, LogOut, Laptop } from "lucide-react";
import type { FullProfile } from "@/types/profile.types";

export function DevicesSection({ profile }: { profile: FullProfile }) {
  const sessions = profile.sessions || [];

  return (
    <div className="space-y-6">
      <SectionCard 
        title="Active Sessions" 
        description="Devices currently signed in to your CloudburstLab account." 
        noPadding
        headerAction={
          sessions.length > 0 && (
            <Button variant="destructive" size="sm" className="rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20 hidden sm:flex">
              Sign Out All
            </Button>
          )
        }
      >
        {sessions.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            No active sessions found.
          </div>
        ) : (
          sessions.map((session, index) => {
            const isCurrent = index === 0; // Assuming first session is current for now
            const isMobile = session.user_agent?.toLowerCase().includes("mobile");
            const isTablet = session.user_agent?.toLowerCase().includes("tablet");
            const DeviceIcon = isMobile ? Smartphone : isTablet ? Tablet : Laptop;
            
            return (
              <div key={session.id}>
                <div className="flex items-start justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/10 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl shrink-0 mt-1 ${isCurrent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <DeviceIcon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-base font-semibold flex items-center gap-2">
                        {session.device_name || "Unknown Device"}
                        {isCurrent && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase tracking-wider font-bold py-0 h-5">Current Session</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {session.user_agent || "Unknown Browser"} • {session.ip_address || "Unknown IP"}
                      </p>
                      <p className={`text-sm font-medium ${isCurrent ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                        {isCurrent ? "Active now" : `Last active: ${new Date(session.updated_on).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0">
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                  </Button>
                </div>
                {index < sessions.length - 1 && <Separator className="opacity-50" />}
              </div>
            );
          })
        )}
        
        {sessions.length > 0 && (
          <div className="p-4 sm:p-6 bg-muted/5 text-center border-t border-border/50 sm:hidden">
            <Button variant="ghost" className="w-full text-destructive hover:text-destructive/80 hover:bg-destructive/10">
              Sign Out All
            </Button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
