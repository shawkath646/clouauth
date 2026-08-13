"use client";
import Image from "next/image";

// 1. Missing imports added
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";

import { PROVIDERS, SOCIAL_PROVIDERS } from "@/constants/providers.constant";

interface SocialProvidersProps {
  onClick: (name: PROVIDERS) => void;
  isLoading?: boolean;
}

export default function SocialProviders({ onClick, isLoading = false }: SocialProvidersProps) {
    return (
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {SOCIAL_PROVIDERS.map((provider) => (
                <Button
                    key={`btn-${provider.id}`}
                    variant="outline"
                    type="button"
                    size="icon"
                    className="w-12 h-12 rounded-xl shadow-xs"
                    disabled={isLoading}
                    aria-label={`Sign up with ${provider.name}`}
                    onClick={() => onClick(provider.id as PROVIDERS)}
                >
                    <Image
                        src={provider.icon}
                        alt={provider.name}
                        width={20}
                        height={20}
                        className={cn("w-5 h-5 object-contain", provider.invertDark && "dark:invert")}
                    />
                </Button>
            ))}
        </div>
    );
}