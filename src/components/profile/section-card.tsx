import { cn } from "@/utils/utils";

interface SectionCardProps {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  variant?: "default" | "danger";
  noPadding?: boolean;
}

export function SectionCard({
  title,
  description,
  children,
  className,
  headerAction,
  variant = "default",
  noPadding = false,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-primary/10 dark:border-primary/10 rounded-xl",
        variant === "danger" 
          ? "border-destructive/20 dark:border-destructive/20" 
          : "border-primary/10 dark:border-primary/10",
        className
      )}
    >
      <div className="flex flex-row items-start justify-between px-5 py-5 sm:px-6 sm:py-5 gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>
      <div className={cn(noPadding ? "p-0" : "px-5 pb-5 pt-0 sm:px-6 sm:pb-6 sm:pt-0")}>
        {children}
      </div>
    </div>
  );
}
