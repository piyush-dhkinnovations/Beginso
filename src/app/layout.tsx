import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import { ToastProvider } from "@/components/common/Toast";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// beginso-ui.css's own required dependency (its header comment names it explicitly) — its
// --bg-font-sans token resolves to this. See src/styles/beginso-ui.css §1 TOKENS.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Beginso",
  description: "Automated Beginso",
  icons: {
    icon: "/favicon.svg",
  },
};

// Placeholder/local theme source until BE 0.5 (User.theme on GET /api/auth/me) ships
// (requirements.md 1.3, 8.3). Deliberately *not* a server cookies() read: this layout wraps
// every route including the public marketing pages and the whole auth flow (/, /blog, /login,
// /signup, ...), all of which prerender statically today — calling cookies() here would force
// every one of them into per-request dynamic rendering just to place one attribute. Instead
// this blocking script (no async/defer, first thing in <body>) resolves the theme from the
// client-writable `theme_preference` cookie (same non-HttpOnly, path=/ pattern as
// `sidebar_collapsed` — see DashboardShell.tsx) with a prefers-color-scheme fallback for
// 'system'/unset, before anything paints. Still zero flash on a cold /login load, without the
// static-generation cost a server-side read would add app-wide.
const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )theme_preference=([^;]*)/);var p=m?decodeURIComponent(m[1]):'system';var dark=p==='dark'||(p!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(dark){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable} ${dmSans.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">
        {/* next/script's beforeInteractive strategy, not a raw <script> tag: it injects before
            hydration and is exempt from React's hydration reconciliation entirely, avoiding
            both the flash this script prevents and React's "script tag" dev warning that a
            plain <script dangerouslySetInnerHTML> child triggers whenever an unrelated
            hydration mismatch elsewhere on the page forces React to regenerate this subtree. */}
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </QueryProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}



