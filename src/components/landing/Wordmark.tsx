import { WORDMARK_DARK, WORDMARK_LIGHT } from "@/lib/brand";

// The full logo (mark and name), served from /public. The logos used before are kept in /public/old-logo.
// name-light.svg (navy/blue) reads on a light surface; name-dark.svg
// (white knockout) reads on a dark one. Swapped by [data-theme] via .wordmark-*
// in globals.css, not hardcoded to one, since the same component renders on
// both light surfaces (nav) and the always-dark footer (see `force`).
export function Wordmark({ height = 24, force }: { height?: number; force?: "light" | "dark" }) {
  const width = height * 2.4; // the artwork is wider than this box (1646:492), so it is drawn centred at the box's width

  if (force) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={force === "dark" ? WORDMARK_DARK : WORDMARK_LIGHT}
        alt="Beginso"
        height={height}
        width={width}
        style={{ height, width, zoom: 'var(--ui-scale, 1)', flexShrink: 0 }}
      />
    );
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={WORDMARK_LIGHT} alt="Beginso" height={height} width={width} style={{ height, width, zoom: 'var(--ui-scale, 1)', flexShrink: 0 }} className="wordmark-light" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={WORDMARK_DARK} alt="Beginso" height={height} width={width} style={{ height, width, zoom: 'var(--ui-scale, 1)', flexShrink: 0 }} className="wordmark-dark" />
    </>
  );
}
