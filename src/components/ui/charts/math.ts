// Pure geometry for the chart components — no React, no DOM.

export type Pt = readonly [number, number];

/** Smooth SVG path through the points (Catmull-Rom → cubic Bézier). */
export function curve(p: Pt[]): string {
  if (p.length === 0) return '';
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** Map values onto a w×h box (y grows downward). With `max`, the baseline is 0; otherwise min–max. */
export function scalePoints(values: number[], w: number, h: number, padY = 4, max?: number): Pt[] {
  const hi = max ?? Math.max(...values);
  const lo = max !== undefined ? 0 : Math.min(...values);
  const span = hi - lo || 1;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  return values.map((v, i) => [i * step, h - padY - ((v - lo) / span) * (h - padY * 2)] as const);
}

/** A round axis maximum ≥ value (1, 2, 5, 10, 20, 50 …) and evenly spaced ticks up to it. */
export function niceAxis(value: number, ticks = 4): { max: number; ticks: number[] } {
  const raw = Math.max(value, 1);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / pow;
  const stepBase = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  const max = Math.max(Math.ceil(raw / ((stepBase * pow) / ticks)) * ((stepBase * pow) / ticks), ticks);
  const step = max / ticks;
  // Whole-number ticks only: counts are never fractional.
  const whole = Number.isInteger(step) ? step : Math.ceil(step);
  const m = whole * ticks;
  return { max: m, ticks: Array.from({ length: ticks + 1 }, (_, i) => i * whole) };
}

/** Indices of x labels to show so they never collide: at most `limit`, always including the last. */
export function labelIndices(count: number, limit: number): Set<number> {
  if (count <= limit) return new Set(Array.from({ length: count }, (_, i) => i));
  const every = Math.ceil(count / limit);
  const out = new Set<number>();
  for (let i = count - 1; i >= 0; i -= every) out.add(i);
  return out;
}
