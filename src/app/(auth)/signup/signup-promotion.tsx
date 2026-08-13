import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/utils/utils";
import { useTranslations } from "@/lib/i18n/hooks";

import { PROVIDERS, SOCIAL_PROVIDERS } from "@/constants/providers.constant";

const ANIMATION_CONFIG: Record<PROVIDERS, { y: number[]; scale: number[]; duration: number; delay: number }> = {
  google: { y: [-4, 4, -4], scale: [0.95, 1.05, 0.95], duration: 5, delay: 0 },
  github: { y: [-3, 3, -3], scale: [0.95, 1.05, 0.95], duration: 5.5, delay: 1 },
  microsoft: { y: [3, -3, 3], scale: [1.02, 0.98, 1.02], duration: 4.8, delay: 1.5 },
  linkedin: { y: [-4, 4, -4], scale: [0.97, 1.03, 0.97], duration: 5.2, delay: 2 },
};

export default function SignUpPromotion() {
    const { t } = useTranslations("signup");

    return (
        <div className="hidden md:flex md:w-5/12 bg-primary/10 dark:bg-primary/5 p-12 flex-col justify-between relative border-r border-primary/10">
            <div className="relative z-10">
                <h2 className="text-4xl font-bold text-foreground mb-6 leading-tight">
                    {t("pitchTitle1")}<br />
                    <span className="text-primary">{t("pitchTitle2")}</span>
                </h2>
                <p className="text-lg text-muted-foreground mb-12">
                    {t("pitchSubtitle")}
                </p>

                {/* Demo Icons Grid */}
                <div className="flex flex-wrap gap-6 opacity-80 justify-center">
                    {SOCIAL_PROVIDERS.map((provider) => {
                        const animArgs = ANIMATION_CONFIG[provider.id];
                        return (
                            <motion.div
                                key={`pitch-${provider.id}`}
                                animate={{ y: animArgs.y, scale: animArgs.scale }}
                                transition={{
                                    repeat: Infinity,
                                    duration: animArgs.duration,
                                    ease: "easeInOut",
                                    delay: animArgs.delay,
                                }}
                                className="w-14 h-14 rounded-2xl bg-background shadow-sm flex items-center justify-center border border-primary/20"
                            >
                                <Image
                                    src={provider.icon}
                                    alt={provider.name}
                                    width={24}
                                    height={24}
                                    className={cn("w-6 h-6 object-contain", provider.invertDark && "dark:invert")}
                                />
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Decorative background elements inside the left column */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        </div>
    );
}