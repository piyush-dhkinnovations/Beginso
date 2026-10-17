import { useSyncExternalStore } from 'react';

// True from 768px up to (not including) 1024px: the width where a 220px sidebar takes about 29% of the screen. False on the
// server, so the first paint matches the desktop layout and a tablet collapses to the icon rail as soon as the page hydrates.
const QUERY = '(min-width: 768px) and (max-width: 1023px)';
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

export function useTablet(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
