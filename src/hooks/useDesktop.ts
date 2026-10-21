import { useSyncExternalStore } from 'react';

// True from 1024px up (where the full-screen response shows the overview beside the card). False on the server.
const QUERY = '(min-width: 1024px)';
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

export function useDesktop(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
