import type { NextConfig } from "next";

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL);
const firebaseAuthOrigin = originOf(
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    ? `https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}`
    : undefined
);
const isDevelopment = process.env.NODE_ENV !== "production";
const connectSources = isDevelopment
  ? ["'self'", "http:", "https:", "ws:", "wss:"]
  : [
      "'self'",
      apiOrigin,
      "https://identitytoolkit.googleapis.com",
      "https://securetoken.googleapis.com",
      "https://accounts.google.com",
      "https://www.googleapis.com",
      "https://vitals.vercel-insights.com",
      "https://*.firebaseio.com",
      "wss://*.firebaseio.com",
    ].filter(Boolean);
const frameSources = ["'self'", firebaseAuthOrigin, "https://accounts.google.com"].filter(Boolean);
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://apis.google.com${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${connectSources.join(" ")}`,
  `frame-src ${frameSources.join(" ")}`,
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Default bottom-left position sits directly on top of the mobile nav drawer, which also
  // opens from the left — dev-only, has no effect on production builds.
  devIndicators: {
    position: "bottom-right",
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
