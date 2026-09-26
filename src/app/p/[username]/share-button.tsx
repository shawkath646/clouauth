"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";

interface PublicProfileShareButtonProps {
  profileUrl: string;
  username: string;
}

export function PublicProfileShareButton({
  profileUrl,
  username,
}: PublicProfileShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `@${username} on ClouAuth`,
          text: `Check out @${username}'s profile on ClouAuth`,
          url: profileUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Profile link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(profileUrl);
        setCopied(true);
        toast.success("Profile link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Could not copy link");
      }
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className="gap-1.5"
      title="Share Profile"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-emerald-500" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </>
      )}
    </Button>
  );
}
