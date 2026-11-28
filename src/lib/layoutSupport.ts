import { isOneAtATime } from '@/components/public-form/layouts/shared';
import type { LayoutPreset } from '@/types/form';

/**
 * Which look settings each layout actually draws (components/public-form/layouts). The Branding studio shows only those: a
 * control that changes nothing is worse than no control. Theme options with their own reasons are in
 * formTheme.themeOptionBlocked.
 */
export function layoutSupports(layout: LayoutPreset) {
  const oneAtATime = isOneAtATime(layout);
  const not = (...layouts: LayoutPreset[]) => !layouts.includes(layout);
  return {
    /** The box around the form, in the owner's card style. */
    card: not('split_feature', 'open', 'focus'),
    logo: not('focus'),
    /** A description line and links under the title. */
    description: not('focus'),
    cover: not('chat', 'focus'),
    /** The cover's shape, banner height and which part shows. */
    coverShape: not('chat', 'focus', 'split_feature', 'open'),
    /** The coloured area drawn in the brand colour: banner, side panel or chat dot. */
    banner: not('open', 'focus'),
    /** Side by side or one per row. */
    columns: layout !== 'compact' && !oneAtATime,
    spacing: !oneAtATime,
    /** A progress bar that can be switched off (the others always show their own). */
    progressSwitch: layout !== 'steps' && !oneAtATime,
  };
}
