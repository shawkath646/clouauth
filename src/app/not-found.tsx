import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you are looking for does not exist or has been moved.",
  robots: {
    index: false,
    follow: true,
  },
};

const DEV_URL = process.env.NEXT_PUBLIC_DEV_URL || "https://shawkath646.dev";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      {/* Logo - Premium Corner Placement */}
      <div className="absolute top-8 left-6 z-50 md:top-10 md:left-10 opacity-50">
        <Link href="/" className="group block">
          <Image
            src={`${process.env.R2_PUBLIC_URL}/branding/icon_light.png`}
            alt="clouburstlab"
            width={180}
            height={24}
            priority
            className="transition-transform duration-500 group-hover:scale-105 dark:hidden object-contain"
          />
          <Image
            src={`${process.env.R2_PUBLIC_URL}/branding/icon_dark.png`}
            alt="clouburstlab"
            width={180}
            height={24}
            priority
            className="hidden transition-transform duration-500 group-hover:scale-105 dark:block object-contain"
          />
        </Link>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 z-0">

        {/* Dot Grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />

        {/* Center Glow */}
        <div className="absolute left-1/2 top-1/2 h-225 w-225 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[180px] animate-pulse duration-3000" />

        {/* Corner Glows */}
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-[140px]" />

        {/* Decorative Rings */}
        <div className="absolute left-16 top-16 h-56 w-56 rounded-full border border-primary/20" />
        <div className="absolute bottom-16 right-16 h-80 w-80 rounded-full border border-primary/20" />

        {/* Gradient Lines */}
        <div className="absolute top-0 left-1/2 h-px w-3/4 -translate-x-1/2 bg-linear-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute bottom-0 left-1/2 h-px w-3/4 -translate-x-1/2 bg-linear-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      {/* Huge Background Text */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none z-0">
        <span className="text-[28vw] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-linear-to-b from-foreground/5 to-transparent">
          404
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center text-center">

        {/* Heading */}
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-muted-foreground">
          Page Not Found
        </h1>

        {/* Description */}
        <p className="mt-10 max-w-md text-base leading-relaxed text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist, may have been
          moved, or is no longer available.
        </p>

        {/* Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center w-full sm:w-auto">
          <Link
            href="/"
            className={buttonVariants({
              className: "h-10 w-full sm:w-auto rounded-full px-8 transition-all shadow-lg shadow-primary/20",
            })}
          >
            Return Home
          </Link>
          <Link
            href={DEV_URL}
            className={buttonVariants({
              variant: "outline",
              className: "h-10 w-full sm:w-auto rounded-full px-8 transition-all bg-background/50 backdrop-blur-sm",
            })}
          >
            Contact Developer
          </Link>
        </div>

      </div>
    </main>
  );
}