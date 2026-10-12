import { formVisual } from '@/lib/formVisual';

/**
 * A form's icon in a quiet neutral tile (the glyph still follows the title, lib/formVisual; one colour for every form, so a list is not a row of pastel squares). A form
 * that has its own logo (branding.logoUrl) shows that alone instead.
 */
export function FormTile({ title, size = 44, logoUrl }: { title: string; size?: number; logoUrl?: string | null }) {
  // A form with its own logo shows just the logo: no tile, border or background around it.
  if (logoUrl) {
    // Small tiles (table rows) show the logo at full size; big ones (cards) leave a little air around it.
    const logo = size < 56 ? size : Math.round(size * 0.8);
    return (
      // eslint-disable-next-line @next/next/no-img-element -- backend-served upload, not a static asset
      <img src={logoUrl} alt="" aria-hidden="true" className="flex-none rounded-lg object-contain" style={{ width: logo, height: logo, margin: (size - logo) / 2 }} />
    );
  }
  const visual = formVisual(title);
  return (
    <span
      aria-hidden="true"
      className="inline-flex flex-none items-center justify-center overflow-hidden rounded-lg border border-(--border-default) bg-(--bg-subtle) text-(--text-secondary)"
      style={{ width: size, height: size }}
    >
      <span className="inline-flex h-1/2 w-1/2 [&>svg]:h-full [&>svg]:w-full [&>svg]:stroke-[1.7]">{visual.icon}</span>
    </span>
  );
}
