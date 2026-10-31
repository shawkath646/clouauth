import type { Dictionary } from "@/types/i18n.types";

export interface SignUpPromotionProps {
  dict: Dictionary<"signup">;
}

export default function SignUpPromotion({ dict }: SignUpPromotionProps) {
  return (
    <div className="hidden md:flex md:w-5/12 bg-primary/10 dark:bg-primary/5 p-12 flex-col justify-between relative border-r border-primary/10">
      <div className="relative z-10">
        <h2 className="text-4xl font-bold text-foreground mb-6 leading-tight">
          {dict.pitchTitle1}<br />
          <span className="text-primary">{dict.pitchTitle2}</span>
        </h2>
        <p className="text-lg text-muted-foreground mb-12">
          {dict.pitchSubtitle}
        </p>
      </div>

      {/* Decorative background elements inside the left column */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
    </div>
  );
}
