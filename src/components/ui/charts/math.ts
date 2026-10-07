// Pure geometry for the chart components — no React, no DOM.

export type Pt = readonly [number, number];

/**
 * Smooth SVG path through the points - monotone cubic (Fritsch-Carlson), so the curve never overshoots the
 * data: between two equal values it is flat, and it never dips below the lowest / above the highest point.
 */
export function curve(p: Pt[]): string {
  const n = p.length;
  if (n === 0) return '';
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  if (n === 1) return d;
  const dx = p.slice(1).map((q, i) => q[0] - p[i][0]);
  const sl = p.slice(1).map((q, i) => (dx[i] === 0 ? 0 : (q[1] - p[i][1]) / dx[i]));
  const m: number[] = [sl[0]];
  for (let i = 1; i < n - 1; i++) m.push(sl[i - 1] * sl[i] <= 0 ? 0 : (sl[i - 1] + sl[i]) / 2);
  m.push(sl[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (sl[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / sl[i];
    const b = m[i + 1] / sl[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      m[i] = (3 * a * sl[i]) / h;
      m[i + 1] = (3 * b * sl[i]) / h;
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const t = dx[i] / 3;
    d += ` C${(p[i][0] + t).toFixed(1)} ${(p[i][1] + m[i] * t).toFixed(1)} ${(p[i + 1][0] - t).toFixed(1)} ${(p[i + 1][1] - m[i + 1] * t).toFixed(1)} ${p[i + 1][0].toFixed(1)} ${p[i + 1][1].toFixed(1)}`;
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
