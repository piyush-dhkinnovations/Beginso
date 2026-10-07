'use client';

import { useSyncExternalStore } from 'react';
import { Search } from 'lucide-react';

/** GlobalSearch listens for this on `window`, so the trigger and the palette share no state or store. */
export const OPEN_SEARCH_EVENT = 'beginso:open-search';

const subscribeNever = () => () => {};

function clientShortcut(): string {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? '';
  return /mac|iphone|ipad/i.test(platform) ? '⌘K' : 'Ctrl K';
}

// Sprint 14 (requirements 2.1, task 3.9): the top-bar search entry - a field-shaped button with the
// platform's shortcut on md+, an icon button below 768px. Both open the same palette.
export function SearchTrigger() {
  // The server render and hydration agree on "Ctrl K"; the platform is read on the client only.
  const shortcut = useSyncExternalStore(subscribeNever, clientShortcut, () => 'Ctrl K');

  const open = () => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Search"
        aria-keyshortcuts="Control+K Meta+K"
        className="hidden min-h-10 w-64 items-center gap-2 rounded-lg border border-(--border-default) bg-(--surface-card) px-3 text-left text-(--text-muted) transition-colors hover:bg-(--surface-hover) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--border-focus)/40 md:flex"
      >
        <Search size={16} aria-hidden="true" />
        <span className="flex-1 bg-body-sm">Search</span>
        <kbd className="bg-kbd" aria-hidden="true">{shortcut}</kbd>
      </button>
      <button
        type="button"
        onClick={open}
        aria-label="Search"
        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-(--text-muted) transition-colors hover:bg-(--surface-hover) hover:text-(--text-primary) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--border-focus)/40 md:hidden"
      >
        <Search size={20} aria-hidden="true" />
      </button>
    </>
  );
}
