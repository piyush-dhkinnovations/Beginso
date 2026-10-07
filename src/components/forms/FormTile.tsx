import { formVisual } from '@/lib/formVisual';

/** A form's icon in a soft tile — the icon and colour are derived from its title (lib/formVisual). */
export function FormTile({ title, size = 44 }: { title: string; size?: number }) {
  const visual = formVisual(title);
  return (
    <span
      aria-hidden="true"
      className="inline-flex flex-none items-center justify-center rounded-xl"
      style={{ width: size, height: size, backgroundColor: visual.surface, color: visual.ink }}
    >
      <span className="inline-flex h-1/2 w-1/2 [&>svg]:h-full [&>svg]:w-full [&>svg]:stroke-[1.7]">{visual.icon}</span>
    </span>
  );
}
