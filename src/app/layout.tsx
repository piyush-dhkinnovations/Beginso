import { ThemeInitScript } from '@/components/providers/ThemeInitScript';
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, DM_Sans, Work_Sans, Lora, Nunito } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import { ToastProvider } from "@/components/ui/Toast";
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

// Respondent-form font choices (Branding → Font). preload:false = the files are only fetched by a form that uses them.
const workSans = Work_Sans({ variable: "--font-work-sans", subsets: ["latin"], preload: false });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], preload: false });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  title: { default: "Beginso", template: "%s · Beginso" },
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
// this blocking script (no async/defer, first thing in <body>) resolves the theme before
// anything paints, still zero-flash on a cold /login load, without the static-generation cost
// a server-side read would add app-wide.
//
// Real bug found and fixed here: this used to read a `theme_preference` cookie first and only
// fall back to `prefers-color-scheme` when it was unset — but no Settings toggle (or anything
// else in the app) has ever written that cookie, so it was pure dead-code precedence that could
// only ever fire from a stray/manually-set browser cookie, permanently pinning the app to that
// value on every reload regardless of the OS theme (reported: system set to dark, page kept
// reloading into light). Until a real theme toggle exists to write it, system preference is the
// only signal that can be trusted — reinstate the cookie priority alongside that toggle's write
// side, not before.
// Sprint 13 (CF2.11): public pages (/f/*, /r/*) and the preview iframe document (?embed=1) never take
// the OS/admin theme — they are styled by the form's own theme (see FormThemeScope).
const THEME_INIT_SCRIPT = `(function(){try{function skip(){var p=location.pathname;return /^[/](f|r)([/]|$)/.test(p)||(/^[/]forms[/][^/]+[/]preview$/.test(p)&&/[?&]embed=1/.test(location.search));}var m=window.matchMedia('(prefers-color-scheme: dark)');function apply(){if(skip())return;if(m.matches){document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.removeAttribute('data-theme');}}apply();if(m.addEventListener){m.addEventListener('change',apply);}else if(m.addListener){m.addListener(apply);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable} ${dmSans.variable} ${workSans.variable} ${lora.variable} ${nunito.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      // THEME_INIT_SCRIPT below legitimately sets data-theme on this element before React
      // hydrates, to avoid a flash of the wrong theme. React doesn't track data-theme here
      // (it's never a prop in this JSX), so it isn't diffed on hydration today regardless —
      // this is the documented belt-and-suspenders for that pattern, not a fix for an
      // observed warning.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Deliberately a raw <script>, not next/script's beforeInteractive strategy — verified
            (Saturday QA, sprint-7-foundation) that beforeInteractive defers actual execution
            until Next's runtime bundle processes its script queue, well after
            domcontentloaded: `data-theme` was still unset at that point in a real production
            build, meaning the page paints light first and flips afterward — exactly the flash
            this script exists to prevent, and requirements.md 1.3's actual acceptance
            criterion. A plain synchronous script (no async/defer) blocks HTML parsing and runs
            immediately at this position, before anything below it paints, which is what a true
            zero-flash guarantee requires. (An earlier version briefly used next/script here to
            silence a dev-only "script tag" console warning — traced separately to an unrelated
            hydration mismatch, not this script — but that trade sacrificed correctness for a
            cosmetic dev warning, so it's reverted.) */}
        <ThemeInitScript code={THEME_INIT_SCRIPT} />
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



