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
      "https://maps.googleapis.com",
      "https://*.firebaseio.com",
      "wss://*.firebaseio.com",
    ].filter(Boolean);
const frameSources = [
  "'self'",
  firebaseAuthOrigin,
  "https://accounts.google.com",
  "https://www.youtube-nocookie.com",
  "https://www.youtube.com",
  "https://player.vimeo.com",
].filter(Boolean);
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://apis.google.com https://maps.googleapis.com${isDevelopment ? " 'unsafe-eval'" : ""}`,
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

// The /dev/ui gallery (sprint-7-foundation, requirements.md 3.1) previews primitives inside
// an <iframe> so beginso-ui.css's real @media breakpoints respond to the selected 375/768/1280
// width — a wrapper div's width alone doesn't trigger them. The blanket `frame-ancestors 'none'`
// above (a real clickjacking defense) blocks that same-origin iframe too: CSP headers from
// multiple matching rules combine by intersection, so a second, laxer rule on top of the
// blanket one would not have loosened it — the general rule's source pattern below excludes
// this one path instead. Scope is deliberately narrow: only `/dev/ui/frame` (never the app's
// own routes), and that route already 404s outside development (see src/app/dev/ui/frame/page.tsx),
// so this header is only ever served by something that also refuses to render in production.
const framePreviewHeaders = securityHeaders.map((h) =>
  h.key === "Content-Security-Policy"
    ? { ...h, value: h.value.replace("frame-ancestors 'none'", "frame-ancestors 'self'") }
    : h.key === "X-Frame-Options"
      ? { ...h, value: "SAMEORIGIN" }
      : h
);

// Public form routes (/f/*) are the one place the product WANTS to be framed: that is what the embed feature is.
// Any origin may frame them (customers' sites are unknowable), and only them: CSP frame-ancestors is widened and
// X-Frame-Options (which cannot express "any origin") is dropped. The form posts nothing sensitive to its embedder
// and reveals its own origin only through the handshake in components/public-form/EmbedBridge.
const publicFormHeaders = securityHeaders
  .filter((h) => h.key !== "X-Frame-Options")
  .map((h) => (h.key === "Content-Security-Policy" ? { ...h, value: h.value.replace("frame-ancestors 'none'", "frame-ancestors *") } : h));

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security",
  },
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
  // Default bottom-left position sits directly on top of the mobile nav drawer, which also
  // opens from the left — dev-only, has no effect on production builds.
  devIndicators: {
    position: "bottom-right",
  },
  // One vocabulary (Inbox / Insights / Exports): the old names stay reachable as permanent aliases.
  // Query strings (?ws=, ?responseId=, ...) are carried over by Next.
  async redirects() {
    const renamed = { responses: "inbox", analytics: "insights", reports: "exports" } as const;
    return [
      // Score comparison was a page of its own; the scores are now a column of the Responses table, sorted there.
      { source: "/forms/:id/scores", destination: "/forms/:id/inbox", permanent: true },
      ...Object.entries(renamed).flatMap(([from, to]) => [
        { source: `/${from}/:path*`, destination: `/${to}/:path*`, permanent: true },
        { source: `/w/:slug/${from}/:path*`, destination: `/w/:slug/${to}/:path*`, permanent: true },
        ...(from === "reports" ? [] : [{ source: `/forms/:id/${from}`, destination: `/forms/:id/${to}`, permanent: true }]),
      ]),
    ];
  },
  async headers() {
    return [
      // Static art in /public served with max-age=0 was revalidated on every page load (QA A11-008).
      ...["/favicon.svg", "/favicon-light.svg", "/favicon-dark.svg", "/name-light.svg", "/name-dark.svg", "/avatars/:path*", "/blog/covers/:path*", "/email/:path*"].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      })),
      // Sprint 13 (A5.4): a signed-link URL must never leak through a referrer.
      { source: "/r/:path*", headers: [...securityHeaders.filter((h) => h.key !== "Referrer-Policy"), { key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/dev/ui/frame", headers: framePreviewHeaders },
      // Sprint 13: the form preview and the layout gallery embed this same-origin route in an
      // <iframe> (components/preview/PreviewFrame). Same narrow carve-out, same reasoning.
      { source: "/forms/:id/preview", headers: framePreviewHeaders },
      // The guest builder previews the logged-out draft in the same way (src/app/try/preview).
      { source: "/try/preview", headers: framePreviewHeaders },
      { source: "/f/:path*", headers: publicFormHeaders },
      { source: "/((?!dev/ui/frame$)(?!forms/[^/]+/preview$)(?!try/preview$)(?!r/)(?!f/).*)", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
