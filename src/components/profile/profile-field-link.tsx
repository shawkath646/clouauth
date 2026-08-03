"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ProfileFieldLinkProps {
  label: string;
  value: string | React.ReactNode;
  href?: string;
  showSeparator?: boolean;
  badge?: React.ReactNode;
}

export function ProfileFieldLink({
  label,
  value,
  href,
  showSeparator = true,
  badge,
}: ProfileFieldLinkProps) {
  const content = (
    <>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      
      <div className="flex items-center gap-3 min-w-0 justify-end text-right">
        {badge && <div className="shrink-0">{badge}</div>}
        <div className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-md">
          {value}
        </div>
        {href && (
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
        )}
      </div>
    </>
  );

  const containerClasses = "w-full flex items-center justify-between px-5 py-4 sm:px-6 gap-4 text-left transition-colors";

  return (
    <>
      {href ? (
        <Link href={href} className={`${containerClasses} hover:bg-muted/10`}>
          {content}
        </Link>
      ) : (
        <div className={containerClasses}>
          {content}
        </div>
      )}
      {showSeparator && <Separator className="opacity-50" />}
    </>
  );
}
