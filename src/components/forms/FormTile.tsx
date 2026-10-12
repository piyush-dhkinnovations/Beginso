import { formVisual } from '@/lib/formVisual';

/**
 * A form's icon in a soft tile. By default the icon and colour are derived from its title (lib/formVisual); a form
 * that has its own logo (branding.logoUrl) shows that instead.
 */
export function FormTile({ title, size = 44, logoUrl }: { title: string; size?: number; logoUrl?: string | null }) {
  const visual = formVisual(title);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-none items-center justify-center overflow-hidden rounded-xl ${logoUrl ? 'border border-(--border-default) bg-white' : ''}`}
      style={{ width: size, height: size, ...(logoUrl ? {} : { backgroundColor: visual.surface, color: visual.ink }) }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- backend-served upload, not a static asset
        <img src={logoUrl} alt="" className="size-full object-contain p-1.5" />
      ) : (
        <span className="inline-flex h-1/2 w-1/2 [&>svg]:h-full [&>svg]:w-full [&>svg]:stroke-[1.7]">{visual.icon}</span>
      )}
    </span>
  );
}
