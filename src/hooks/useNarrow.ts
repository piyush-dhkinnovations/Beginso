import { useSyncExternalStore } from 'react';

// True below 768px (the guest editor's mobile breakpoint). False on the server.
const QUERY = '(max-width: 767px)';
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

export function useNarrow(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
