import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    // In development, use a relaxed CSP to avoid blocking HMR, Clerk, etc.
    // In production, use a safe CSP allowing styles, fonts, and images.
    const csp = isDev
      ? [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
          "connect-src 'self' https: ws: wss:",
          "style-src 'self' 'unsafe-inline' https:",
          "img-src 'self' data: blob: https:",
          "font-src 'self' https: data:",
          "media-src 'self' blob: data: https://d8j0ntlcm91z4.cloudfront.net",
          "worker-src 'self' blob:",
          "frame-src https:",
        ].join("; ")
      : [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: https://*.clerk.accounts.dev https://*.clerk.com",
          "connect-src 'self' https: https://api.sarvam.ai https://*.clerk.accounts.dev https://*.clerk.com wss:",
          "style-src 'self' 'unsafe-inline' https:",
          "img-src 'self' data: blob: https:",
          "font-src 'self' https: data:",
          "media-src 'self' blob: data: https://d8j0ntlcm91z4.cloudfront.net",
          "worker-src 'self' blob:",
          "frame-src https: https://*.clerk.accounts.dev https://*.clerk.com",
        ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          ...(isDev
            ? []
            : [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains",
                },
              ]),
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
