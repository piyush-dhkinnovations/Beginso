"use client";

import { useEffect, useRef, useState } from "react";
import { bx } from "@/lib/utils";

type Theme = "light" | "dark";
type DarkVariant = "slate" | "midnight" | "dimmed";
const WIDTHS = [375, 768, 1280, "Full"] as const;
type Width = (typeof WIDTHS)[number];

// The gallery's controls + preview frame (requirements.md 3.1): a visible theme toggle
// (light/dark × Slate/Midnight/Dimmed, not a URL param) and a width selector (375/768/1280/Full,
// not manual browser resize). The preview itself renders inside an <iframe> (frame/page.tsx)
// so beginso-ui.css's real @media breakpoints respond to the selected width — see that
// route's own comment. Same-origin, so the attribute is set directly on its document via a
// ref rather than round-tripping through the iframe's URL.
//
// Layout: the shell is exactly one viewport tall — a slim header, then the frame fills what is
// left and scrolls inside itself (the section index in the frame stays put). No page-level
// scrollbar competing with the frame's own.
function Segmented<T extends string | number>({ label, options, value, onChange, render }: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void; render?: (v: T) => string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-1 rounded-lg border border-(--border-default) bg-(--surface-card) p-1">
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={bx(
            "rounded-md px-3 py-1.5 bg-body-sm font-medium capitalize transition-colors",
            value === o ? "bg-(--action-primary) text-(--text-on-brand)" : "text-(--text-secondary) hover:bg-(--surface-hover)",
          )}
        >
          {render ? render(o) : String(o)}
        </button>
      ))}
    </div>
  );
}

export function UiGalleryShell() {
  const [theme, setTheme] = useState<Theme>("light");
  const [darkVariant, setDarkVariant] = useState<DarkVariant>("slate");
  const [width, setWidth] = useState<Width>("Full");
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
    const doc = iframeRef.current?.contentDocument;
    // Apply to the frame's <html> so the whole document (including portalled modals) themes, not
    // just #gallery-root.
    const targets = [doc?.documentElement, doc?.getElementById("gallery-root")].filter(Boolean) as HTMLElement[];
    for (const el of targets) {
      if (theme === "dark") {
        el.setAttribute("data-theme", "dark");
        if (darkVariant === "slate") el.removeAttribute("data-dark");
        else el.setAttribute("data-dark", darkVariant);
      } else {
        el.removeAttribute("data-theme");
        el.removeAttribute("data-dark");
      }
    }
  }, [theme, darkVariant, frameLoaded]);

  return (
    <div className="flex h-screen flex-col bg-(--bg-sunken)">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-(--border-default) bg-(--surface-card) px-6 py-3">
        <div className="flex flex-col leading-tight">
          <strong className="bg-body font-semibold">Beginso UI gallery</strong>
          <span className="bg-caption text-(--text-muted)">Every shared component, on sample data</span>
        </div>

        <Segmented label="Theme" options={["light", "dark"] as const} value={theme} onChange={setTheme} />

        <label className={bx("flex items-center gap-2 bg-body-sm", theme !== "dark" && "opacity-50")}>
          Dark variant
          <select
            value={darkVariant}
            disabled={theme !== "dark"}
            onChange={(e) => setDarkVariant(e.target.value as DarkVariant)}
            className="bg-select"
            style={{ width: 130, height: 36 }}
          >
            <option value="slate">Slate</option>
            <option value="midnight">Midnight</option>
            <option value="dimmed">Dimmed</option>
          </select>
        </label>

        <Segmented label="Preview width" options={WIDTHS} value={width} onChange={setWidth} render={(w) => (typeof w === "number" ? `${w}px` : w)} />
      </header>

      <div className="flex min-h-0 flex-1 justify-center overflow-hidden p-4">
        <iframe
          ref={iframeRef}
          title="components/ui/ preview"
          style={{ width: width === "Full" ? "100%" : width, maxWidth: "100%" }}
          className="h-full border border-(--border-strong) bg-(--surface-card) shadow-(--shadow-md)"
        />
      </div>
    </div>
  );
}
