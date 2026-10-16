import { User } from 'lucide-react';
import { formVisual } from '@/lib/formVisual';
import { initialsOf } from '@/lib/formatters';


// Readable ink on an arbitrary brand hex (WCAG relative luminance, threshold at the black/white crossover).
function inkFor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#fff';
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#111827' : '#fff';
}

/** Owner initials on a disc coloured from the form's own branding colour (falls back to the title-derived tile colour). */
export function OwnerMonogram({ name, brandColor, title }: { name?: string; brandColor?: string; title: string }) {
  const hasBrand = !!brandColor && /^#?[0-9a-f]{6}$/i.test(brandColor.trim());
  // The fallback is a CSS token (not a hex inkFor can read), so darken it until white text clears 4.5:1 in both themes.
  const bg = hasBrand ? brandColor! : `color-mix(in srgb, ${formVisual(title).ink} 55%, black)`;
  return (
    <span
      role="img"
      aria-label={name ? `Owned by ${name}` : 'Owner unknown'}
      title={name}
      className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-caption font-semibold"
      style={{ backgroundColor: bg, color: hasBrand ? inkFor(bg) : '#fff' }}
    >
      {initialsOf(name) || <User size={14} aria-hidden="true" />}
    </span>
  );
}
