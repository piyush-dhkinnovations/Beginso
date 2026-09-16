const LOGO_FULL_LIGHT = "https://storage.beginso.com/assets/logo-full-light.svg";
const LOGO_FULL_DARK = "https://storage.beginso.com/assets/logo-full-dark.svg";

// logo-full-light.svg (navy/blue) reads on a light surface; logo-full-dark.svg
// (white knockout) reads on a dark one. Swapped by [data-theme] via .wordmark-*
// in globals.css, not hardcoded to one, since the same component renders on
// both light surfaces (nav) and the always-dark footer (see `force`).
export function Wordmark({ height = 24, force }: { height?: number; force?: "light" | "dark" }) {
  const width = height * 2.4; // logo-full-*.svg aspect ratio is 1200:500

  if (force) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={force === "dark" ? LOGO_FULL_DARK : LOGO_FULL_LIGHT}
        alt="Beginso"
        height={height}
        width={width}
        style={{ height, width }}
      />
    );
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_FULL_LIGHT} alt="Beginso" height={height} width={width} style={{ height, width }} className="wordmark-light" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_FULL_DARK} alt="Beginso" height={height} width={width} style={{ height, width }} className="wordmark-dark" />
    </>
  );
}
