'use client';

import { useSyncExternalStore } from 'react';
import { TEXT_SCALE, isTextSize, type TextSize } from '@/lib/theme';

const subscribe = (notify: () => void) => {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-text'] });
  return () => observer.disconnect();
};
const read = (): TextSize => {
  const v = document.documentElement.getAttribute('data-text');
  return isTextSize(v) ? v : 'default';
};

/**
 * How much bigger than normal the text is right now (1, 1.125 or 1.25), following the Text size setting on <html>. Drawings that are measured in
 * pixels, such as the SVG charts, multiply their text and the room around it by this; everything written in rem follows on its own.
 */
export function useTextScale(): number {
  return TEXT_SCALE[useSyncExternalStore(subscribe, read, () => 'default' as TextSize)];
}
