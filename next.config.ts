import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.clouburstlab.com",
        port: '',
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: '',
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: '',
      },
    ]
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        {
          key: "Content-Security-Policy",
          value: `default-src 'self'; script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://assets.clouburstlab.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com https:; font-src 'self' data:; connect-src 'self' https://accounts.google.com https://*.googleapis.com https://api.github.com; frame-src 'self' https://accounts.google.com; object-src 'none'; base-uri 'self';`,
        },
      ],
    },
  ],
};

export default nextConfig;
