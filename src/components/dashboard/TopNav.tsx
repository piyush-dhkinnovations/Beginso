'use client';

import { Menu } from 'lucide-react';
import { UserProfileDropdown } from './UserProfileDropdown';
import { NotificationBell } from './NotificationBell';

interface TopNavProps {
  onMenuClick?: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-[56px] bg-white border-b border-neutral-200 z-30 flex items-center justify-between px-4">
      {/* Left side: mobile menu trigger + Brand Logo/Title */}
      <div className="flex items-center gap-2">
        {/* Only visible below the shell's 520px container breakpoint — see .dashboard-mobile-menu-btn in globals.css */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="dashboard-mobile-menu-btn min-h-11 min-w-11 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none"
        >
          <Menu size={20} />
        </button>

        {/* Brand/App Title */}
        <span className="text-body font-bold text-neutral-900 tracking-tight">
          Beginso
        </span>
      </div>

      {/* Right side: Notifications & User Profile */}
      <div className="flex items-center gap-2">
        <NotificationBell />
        <UserProfileDropdown />
      </div>
    </header>
  );
}
