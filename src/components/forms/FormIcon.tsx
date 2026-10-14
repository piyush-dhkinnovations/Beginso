import type { ReactNode } from 'react';
import { getFormIcon, type FormIconDef } from '@/lib/formIcons';

/** The illustration itself, at `size` px. The markup is the generated static icon data, never user input. */
export function IconArt({ icon, size }: { icon: FormIconDef; size: number | string }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: icon.body }} />;
}

/** The rounded white tile every form icon sits on. Its corners are a percentage of its size, so a ring drawn around it follows the same curve. */
export function IconTile({ size, fill, className = '', children }: { size: number; fill?: boolean; className?: string; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-none items-center justify-center border border-(--border-default) bg-white ${fill ? 'size-full' : ''} ${className}`}
      style={{ ...(fill ? {} : { width: size, height: size }), borderRadius: '26%' }}
    >
      {children}
    </span>
  );
}

/** A form's chosen icon on its tile. Renders nothing for a name this build does not know (for example one removed from the set). */
export function FormIcon({ name, size = 40, fill }: { name: string | null | undefined; size?: number; fill?: boolean }) {
  const icon = getFormIcon(name);
  if (!icon) return null;
  return (
    <IconTile size={size} fill={fill}>
      {/* Artwork takes about two thirds of the tile, so there is a clear margin of white around it. */}
      <IconArt icon={icon} size={fill ? '62%' : Math.round(size * 0.64)} />
    </IconTile>
  );
}
