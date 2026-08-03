"use client";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/misc/utils";
import { ChevronRight } from "lucide-react";
import React from "react";

interface EditableFieldProps {
  label: string;
  value: string | React.ReactNode;
  onEdit?: () => void;
  editLabel?: string; // Kept for compatibility if used elsewhere, but visually ignored
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  showSeparator?: boolean;
}

export function EditableField({
  label,
  value,
  onEdit,
  icon,
  badge,
  showSeparator = true,
}: EditableFieldProps) {
  const Component = onEdit ? "button" : "div";
  
  return (
    <>
      <Component 
        onClick={onEdit}
        className={cn(
          "w-full flex items-center justify-between px-5 py-4 sm:px-6 gap-4 text-left transition-colors",
          onEdit ? "hover:bg-muted/10 cursor-pointer" : ""
        )}
      >
        <div className="flex items-center gap-3 shrink-0">
          {icon && (
            <div className="text-muted-foreground shrink-0 flex items-center justify-center w-5 h-5">
              {icon}
            </div>
          )}
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        
        <div className="flex items-center gap-3 min-w-0 justify-end text-right">
          {badge && <div className="shrink-0">{badge}</div>}
          <div className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-md">
            {value}
          </div>
          {onEdit && (
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          )}
        </div>
      </Component>
      {showSeparator && <Separator className="opacity-50" />}
    </>
  );
}
