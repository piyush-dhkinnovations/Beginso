// name-light.svg (navy/blue) reads on a light surface; name-dark.svg (white
// knockout) reads on a dark one. Swapped by [data-theme] via .wordmark-* in
// globals.css, not hardcoded to one, since the same component renders on
// both light surfaces (nav) and the always-dark footer (see `force`).
export function Wordmark({ height = 24, force }: { height?: number; force?: "light" | "dark" }) {
  const width = height * 2.4; // name-*.svg aspect ratio is 1200:500

  if (force) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={force === "dark" ? "/name-dark.svg" : "/name-light.svg"}
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
      <img src="/name-light.svg" alt="Beginso" height={height} width={width} style={{ height, width }} className="wordmark-light" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/name-dark.svg" alt="Beginso" height={height} width={width} style={{ height, width }} className="wordmark-dark" />
    </>
  );
}
