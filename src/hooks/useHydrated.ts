'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False while the server renders and during the first (hydrating) client render, true from then on. For content that only the client
 * knows at load (data already in the React Query cache, localStorage): render the server's version until this is true, so the first
 * client render matches the HTML and React does not throw the page away ("Hydration failed").
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
