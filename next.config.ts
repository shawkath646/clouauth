import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : "'unsafe-eval' "}https://vercel.live https://*.vercel.live https://accounts.google.com https://apis.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/`,
  "script-src-elem 'self' 'unsafe-inline' https://vercel.live https://*.vercel.live https://accounts.google.com https://apis.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
  "style-src 'self' 'unsafe-inline' https://vercel.live https://accounts.google.com https://www.gstatic.com/recaptcha/",
  "img-src 'self' data: blob: https://vercel.live https://vercel.com https://assets.clouburstlab.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
  "font-src 'self' data: https://vercel.live https://assets.vercel.com",
  "connect-src 'self' https://vercel.live https://*.vercel.live wss://*.pusher.com https://*.pusher.com https://accounts.google.com https://*.googleapis.com https://api.github.com https://www.google.com/recaptcha/",
  "frame-src 'self' https://vercel.live https://accounts.google.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

// Standardized W3C Permissions-Policy without deprecated/unrecognized Privacy Sandbox ad features
// ('run-ad-auction', 'join-ad-interest-group', 'private-aggregation', 'attribution-reporting' removed)
const permissionsPolicy = "camera=(), microphone=(), geolocation=(), payment=(), usb=()";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: [
    "mssql",
    "tedious",
    "@azure/identity",
    "open",
    "powershell-utils",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.clouburstlab.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
      },
    ],
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: permissionsPolicy },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: cspDirectives,
        },
      ],
    },
  ]
};

export default nextConfig;
