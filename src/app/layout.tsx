import { ThemeInitScript } from '@/components/providers/ThemeInitScript';
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, DM_Sans, Work_Sans, Lora, Nunito, Poppins, Manrope, Plus_Jakarta_Sans, Outfit, Space_Grotesk, Montserrat, Playfair_Display, Merriweather, Source_Serif_4, Fraunces, DM_Serif_Display, Quicksand, Fredoka, Caveat, Pacifico, Bebas_Neue, Space_Mono } from "next/font/google";
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

// More respondent-form typefaces (lib/formTheme.ts FORM_FONT_OPTIONS lists them). Same rule: a file is only fetched by a form that uses it.
const poppinsFont = Poppins({ variable: "--font-poppins", subsets: ["latin"], preload: false, weight: ['400', '500', '600', '700'] });
const manropeFont = Manrope({ variable: "--font-manrope", subsets: ["latin"], preload: false });
const plusjakartasansFont = Plus_Jakarta_Sans({ variable: "--font-plus-jakarta-sans", subsets: ["latin"], preload: false });
const outfitFont = Outfit({ variable: "--font-outfit", subsets: ["latin"], preload: false });
const spacegroteskFont = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], preload: false });
const montserratFont = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], preload: false });
const playfairdisplayFont = Playfair_Display({ variable: "--font-playfair-display", subsets: ["latin"], preload: false });
const merriweatherFont = Merriweather({ variable: "--font-merriweather", subsets: ["latin"], preload: false, weight: ['400', '700'] });
const sourceserif4Font = Source_Serif_4({ variable: "--font-source-serif-4", subsets: ["latin"], preload: false });
const frauncesFont = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], preload: false });
const dmserifdisplayFont = DM_Serif_Display({ variable: "--font-dm-serif-display", subsets: ["latin"], preload: false, weight: ['400'] });
const quicksandFont = Quicksand({ variable: "--font-quicksand", subsets: ["latin"], preload: false });
const fredokaFont = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], preload: false });
const caveatFont = Caveat({ variable: "--font-caveat", subsets: ["latin"], preload: false });
const pacificoFont = Pacifico({ variable: "--font-pacifico", subsets: ["latin"], preload: false, weight: ['400'] });
const bebasneueFont = Bebas_Neue({ variable: "--font-bebas-neue", subsets: ["latin"], preload: false, weight: ['400'] });
const spacemonoFont = Space_Mono({ variable: "--font-space-mono", subsets: ["latin"], preload: false, weight: ['400', '700'] });

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
// The script reads the person's choice from localStorage ('beginso.theme': system | light | dark, and
// 'beginso.darkVariant': slate | midnight | dimmed), written by Settings → Appearance (lib/theme.ts) and synced from the account's
// saved `theme` after sign-in (authContext). With no saved choice it follows the OS setting, live. It deliberately
// never reads a cookie (the old `theme_preference` cookie was never written by anything).
// Sprint 13 (CF2.11): public pages (/f/*, /r/*) and the preview iframe document (?embed=1) never take
// the OS/admin theme — they are styled by the form's own theme (see FormThemeScope).
// The light style ('beginso.lightVariant': classic | paper | mist) is `data-light` while the page is light (Classic is no attribute), and the
// text size ('beginso.textSize': default | large | xlarge) is `data-text` (Default is no attribute) in the signed-in app only. Both are set
// here, before first paint, the same way the dark style is, so nothing flashes.
const THEME_INIT_SCRIPT = `(function(){try{function skip(){var p=location.pathname;return /^[/](f|r)([/]|$)/.test(p)||(/^[/]forms[/][^/]+[/]preview$/.test(p)&&/[?&]embed=1/.test(location.search));}function get(k){try{return localStorage.getItem(k);}catch(e){return null;}}var m=window.matchMedia('(prefers-color-scheme: dark)');function apply(){if(skip())return;var pref=get('beginso.theme');var v=get('beginso.darkVariant');var l=get('beginso.lightVariant');var r=document.documentElement;var dark=pref==='dark'||(pref!=='light'&&m.matches);if(dark){r.setAttribute('data-theme','dark');if(v==='midnight'||v==='dimmed'){r.setAttribute('data-dark',v);}else{r.removeAttribute('data-dark');}r.removeAttribute('data-light');}else{r.removeAttribute('data-theme');r.removeAttribute('data-dark');if(l==='paper'||l==='mist'){r.setAttribute('data-light',l);}else{r.removeAttribute('data-light');}}}function size(){if(skip()||!/^[/](dashboard|exports|form-responses|forms|inbox|insights|my-submissions|notifications|search|settings|shared|templates|trash|workspaces|w)([/]|$)/.test(location.pathname))return;var t=get('beginso.textSize');var r=document.documentElement;if(t==='large'||t==='xlarge'){r.setAttribute('data-text',t);}else{r.removeAttribute('data-text');}}apply();size();if(m.addEventListener){m.addEventListener('change',apply);}else if(m.addListener){m.addListener(apply);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable} ${dmSans.variable} ${workSans.variable} ${lora.variable} ${nunito.variable} ${poppinsFont.variable} ${manropeFont.variable} ${plusjakartasansFont.variable} ${outfitFont.variable} ${spacegroteskFont.variable} ${montserratFont.variable} ${playfairdisplayFont.variable} ${merriweatherFont.variable} ${sourceserif4Font.variable} ${frauncesFont.variable} ${dmserifdisplayFont.variable} ${quicksandFont.variable} ${fredokaFont.variable} ${caveatFont.variable} ${pacificoFont.variable} ${bebasneueFont.variable} ${spacemonoFont.variable} h-full antialiased`}
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
        {/* Production only. In development both load a "debug" script from va.vercel-scripts.com, which our own Content-Security-Policy
            blocks, so every dev page load (and every end-to-end run) logged two console errors that mean nothing in production, where
            the scripts are served from this site. */}
        {process.env.NODE_ENV === 'production' && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}



