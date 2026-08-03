import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/misc/utils";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  title: {
    default: "CloudburstLab",
    template: "%s | CloudburstLab",
  },
  description: "Secure, seamless authentication and identity management by CloudburstLab.",
  applicationName: "CloudburstLab Auth",
  authors: [{ name: "CloudburstLab Team" }],
  generator: "Next.js",
  keywords: ["authentication", "identity", "security", "saas", "cloudburstlab"],
  creator: "CloudburstLab",
  publisher: "CloudburstLab",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "CloudburstLab Auth",
    title: "CloudburstLab Authentication",
    description: "Secure, seamless authentication and identity management by CloudburstLab.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "CloudburstLab Authentication",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CloudburstLab",
    description: "Secure authentication built for modern teams.",
    creator: "@cloudburstlab",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
      suppressHydrationWarning
    >
      {/* <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head> */}
      <body className="min-h-full bg-white text-black dark:bg-black dark:text-white">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
