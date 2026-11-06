// WCAG contrast between two hex colours, for the form colour warnings in the branding studio.
const HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function rgb(hex: string): [number, number, number] | null {
  if (!HEX.test(hex)) return null;
  const h = hex.slice(1);
  const f = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) as [number, number, number];
}

const luminance = ([r, g, b]: [number, number, number]) => {
  const [lr, lg, lb] = [r, g, b].map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

/** The ratio from 1 to 21, or null when either value is not a hex colour. */
export function contrastRatio(a: string, b: string): number | null {
  const [x, y] = [rgb(a), rgb(b)];
  if (!x || !y) return null;
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

/** Text needs 4.5:1 (WCAG AA). */
export const TEXT_CONTRAST = 4.5;

const toHex = ([r, g, b]: [number, number, number]) => `#${[r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/**
 * The closest colour to `fg` that reaches `min` against `bg`: `fg` is moved toward black or white, whichever needs the smaller move, so the
 * colour keeps its hue as far as it can. Black or white (the better of the two) when no step is enough; null when either is not a hex colour.
 */
export function fixContrast(fg: string, bg: string, min: number): string | null {
  const from = rgb(fg);
  if (!from || !rgb(bg)) return null;
  const toward = (end: number): string | null => {
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const c = toHex(from.map((x) => x + (end - x) * Math.min(t, 1)) as [number, number, number]);
      if ((contrastRatio(c, bg) ?? 0) >= min) return c;
    }
    return null;
  };
  const dark = toward(0);
  const light = toward(255);
  if (dark && light) return Math.abs(contrastRatio(dark, fg)! - 1) <= Math.abs(contrastRatio(light, fg)! - 1) ? dark : light;
  return dark ?? light ?? ((contrastRatio('#000000', bg) ?? 0) >= (contrastRatio('#FFFFFF', bg) ?? 0) ? '#000000' : '#FFFFFF');
}
