"use client";

import { useEffect, useRef, useState } from "react";
import { bx } from "@/lib/utils";

type Theme = "light" | "dark";
type DarkVariant = "slate" | "midnight" | "dimmed";
const WIDTHS = [375, 768, 1280] as const;

// The gallery's controls + preview frame (requirements.md 3.1): a visible theme toggle
// (light/dark × Slate/Midnight/Dimmed, not a URL param) and a width selector (375/768/1280,
// not manual browser resize). The preview itself renders inside an <iframe> (frame/page.tsx)
// so beginso-ui.css's real @media breakpoints respond to the selected width — see that
// route's own comment. Same-origin, so the attribute is set directly on its document via a
// ref rather than round-tripping through the iframe's URL.
export function UiGalleryShell() {
  const [theme, setTheme] = useState<Theme>("light");
  const [darkVariant, setDarkVariant] = useState<DarkVariant>("slate");
  const [width, setWidth] = useState<(typeof WIDTHS)[number]>(1280);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Set `src` imperatively, after the `load` listener is attached, rather than via the JSX
  // `src`/`onLoad` props — a same-origin iframe can finish loading before React commits and
  // attaches `onLoad`, silently dropping the event (confirmed: frameLoaded never flipped true
  // with the prop-based version, so the theme toggle below had no visible effect at all).
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const handleLoad = () => setFrameLoaded(true);
    iframe.addEventListener("load", handleLoad);
    iframe.src = "/dev/ui/frame";
    return () => iframe.removeEventListener("load", handleLoad);
  }, []);

  useEffect(() => {
    if (!frameLoaded) return;
    const root = iframeRef.current?.contentDocument?.getElementById("gallery-root");
    if (!root) return;
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
      if (darkVariant === "slate") root.removeAttribute("data-dark");
      else root.setAttribute("data-dark", darkVariant);
    } else {
      root.removeAttribute("data-theme");
      root.removeAttribute("data-dark");
    }
  }, [theme, darkVariant, frameLoaded]);

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      <header className="flex flex-wrap items-center gap-6 border-b border-neutral-200 bg-white px-6 py-4">
        <strong>components/ui/ gallery</strong>

        <div className="flex items-center gap-2" role="group" aria-label="Theme">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              aria-pressed={theme === t}
              className={bx(
                "px-3 py-1.5 rounded-md text-sm capitalize border",
                theme === t ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-300"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm">
          Variant
          <select
            value={darkVariant}
            disabled={theme !== "dark"}
            onChange={(e) => setDarkVariant(e.target.value as DarkVariant)}
            className="border border-neutral-300 rounded-md px-2 py-1"
          >
            <option value="slate">Slate</option>
            <option value="midnight">Midnight</option>
            <option value="dimmed">Dimmed</option>
          </select>
        </label>

        <div className="flex items-center gap-2" role="group" aria-label="Width">
          {WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWidth(w)}
              aria-pressed={width === w}
              className={bx(
                "px-3 py-1.5 rounded-md text-sm border",
                width === w ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-300"
              )}
            >
              {w}px
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <iframe
          ref={iframeRef}
          title="components/ui/ preview"
          style={{ width, height: "calc(100vh - 140px)", maxWidth: "100%" }}
          className="mx-auto block border border-neutral-300 bg-white"
        />
      </div>
    </div>
  );
}
