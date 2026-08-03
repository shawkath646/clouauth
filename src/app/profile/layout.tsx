import Link from "next/link";
import Image from "next/image";
import iconLight from "@/assets/icon_light.png";
import iconDark from "@/assets/icon_dark.png";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BackgroundStars } from "@/components/landing/background-stars";
import { LogOut } from "lucide-react";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col relative bg-primary/5 dark:bg-primary/5">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <BackgroundStars />
        <div className="absolute inset-0 bg-linear-to-tr from-primary/10 via-primary/5 to-transparent dark:from-primary/20" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 animate-pulse" />
        <div className="absolute top-32 right-32 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl opacity-50 animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-primary/20 bg-background/70 dark:bg-card/40 backdrop-blur-xl">
        <div className="w-full max-w-360 mx-auto flex h-16 items-center justify-between px-4 sm:px-8">

          <Link href="/profile" className="flex items-center">
            {/* Dark Mode Logo */}
            <Image
              src={iconDark}
              alt="CloudburstLab"
              width={144}
              height={40}
              priority
              className="hidden dark:block object-contain"
            />
            {/* Light Mode Logo */}
            <Image
              src={iconLight}
              alt="CloudburstLab"
              width={144}
              height={40}
              priority
              className="block dark:hidden object-contain"
            />
          </Link>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/signin" className={buttonVariants({ variant: "ghost", size: "sm", className: "text-destructive hover:text-destructive hover:bg-destructive/10" })}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Link>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 w-full max-w-360 mx-auto p-4 sm:p-8">
        {children}
      </main>
    </div>
  );
}
