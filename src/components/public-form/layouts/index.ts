import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { LayoutPreset } from '@/types/form';
import { ClassicLayout } from './ClassicLayout';
import type { LayoutFrameProps } from './shared';

export type { LayoutFrameProps } from './shared';
export { fieldsClassFor, isGrouped } from './shared';

// Classic is the default and ships in the main bundle; the other five are code-split so a form
// using Classic never pays for them (requirements.md §15).
export const LAYOUT_COMPONENTS: Record<LayoutPreset, ComponentType<LayoutFrameProps>> = {
  classic: ClassicLayout,
  card_stack: dynamic(() => import('./CardStackLayout').then((m) => m.CardStackLayout)),
  guided: dynamic(() => import('./GuidedLayout').then((m) => m.GuidedLayout)),
  steps: dynamic(() => import('./StepsLayout').then((m) => m.StepsLayout)),
  split_feature: dynamic(() => import('./SplitFeatureLayout').then((m) => m.SplitFeatureLayout)),
  compact: dynamic(() => import('./CompactLayout').then((m) => m.CompactLayout)),
};
