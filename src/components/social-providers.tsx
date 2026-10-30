"use client";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";
import { PROVIDERS, SOCIAL_PROVIDERS } from "@/constants/providers.constant";

interface SocialProvidersProps {
  onClick: (name: PROVIDERS) => void;
  isLoading?: boolean;
  activeProvider?: PROVIDERS | null;
}

export default function SocialProviders({
  onClick,
  isLoading = false,
  activeProvider = null,
}: SocialProvidersProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {SOCIAL_PROVIDERS.map((provider) => {
        const isCurrentActive = isLoading && activeProvider === provider.id;

        return (
          <Button
            key={`btn-${provider.id}`}
            variant="outline"
            type="button"
            size="icon"
            className="w-12 h-12 rounded-xl shadow-xs transition-transform active:scale-95"
            disabled={isLoading}
            aria-label={`Sign in with ${provider.name}`}
            onClick={() => onClick(provider.id as PROVIDERS)}
          >
            {isCurrentActive ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : (
              <Image
                src={provider.icon}
                alt={provider.name}
                width={20}
                height={20}
                className={cn(
                  "w-5 h-5 object-contain",
                  provider.invertDark && "dark:invert"
                )}
              />
            )}
          </Button>
        );
      })}
    </div>
  );
}
