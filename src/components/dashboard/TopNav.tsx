'use client';

import { Bell } from 'lucide-react';
import { UserProfileDropdown } from './UserProfileDropdown';

export function TopNav() {
  return (
    <header className="fixed top-0 left-0 right-0 h-[56px] bg-white border-b border-neutral-200 z-30 flex items-center justify-between px-4">
      {/* Left side: Brand Logo/Title. Mobile navigation sits directly below this bar. */}
      <div className="flex items-center gap-3">
        {/* Brand/App Title */}
        <span className="text-body font-bold text-neutral-900 tracking-tight">
          Beginso
        </span>
      </div>

      {/* Right side: Notifications & User Profile */}
      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <button
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors relative focus:outline-none"
          aria-label="View notifications"
        >
          <Bell size={20} />
          {/* notification dot removed — add back when real notifications exist */}

        </button>

        {/* User Dropdown */}
        <UserProfileDropdown />
      </div>
    </header>
  );
}
