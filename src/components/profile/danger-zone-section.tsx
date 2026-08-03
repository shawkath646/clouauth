"use client";

import { SectionCard } from "@/components/profile/section-card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, LogOut, AlertTriangle } from "lucide-react";
import type { FullProfile } from "@/types/profile.types";

export function DangerZoneSection({ profile }: { profile: FullProfile }) {
  return (
    <div className="space-y-6">
      <SectionCard variant="danger" title="Danger Zone" description="Irreversible and destructive actions." noPadding>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/10 transition-colors">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3 bg-destructive/10 text-destructive rounded-xl shrink-0 mt-1 sm:mt-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-semibold">Delete Account</h4>
              <p className="text-sm font-normal text-muted-foreground mt-1">Permanently delete your account and all associated data. This action cannot be undone.</p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" size="sm" className="rounded-full shrink-0 self-start sm:self-center" />}>
              Delete Account
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-xl border-destructive/20 bg-background/95 backdrop-blur-xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full">Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <Separator className="opacity-50" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/10 transition-colors">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3 bg-destructive/10 text-destructive rounded-xl shrink-0 mt-1 sm:mt-0">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-semibold">Sign Out All Devices</h4>
              <p className="text-sm font-normal text-muted-foreground mt-1">Sign out from all devices and sessions.</p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" size="sm" className="rounded-full shrink-0 self-start sm:self-center" />}>
              Sign Out All
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-xl border-primary/20 bg-background/95 backdrop-blur-xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out all devices?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be signed out from all devices. You will need to sign in again on each device.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full">Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SectionCard>
    </div>
  );
}
