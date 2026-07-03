'use client';

import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { UserProfileDropdown } from './UserProfileDropdown';

interface TopNavProps {
  onToggleMobileSidebar: () => void;
}

export function TopNav({ onToggleMobileSidebar }: TopNavProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-[56px] bg-white border-b border-neutral-200 z-30 flex items-center justify-between px-4">
      {/* Left side: Hamburger (mobile) and Brand Logo/Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="p-1 rounded-md text-neutral-500 hover:bg-neutral-100 transition-colors md:hidden focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          aria-label="Toggle navigation menu"
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
        {/* Notification Bell */}
        <button
          className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors relative focus:outline-none"
          aria-label="View notifications"
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-600 ring-2 ring-white"></span>
        </button>

        {/* User Dropdown */}
        <UserProfileDropdown />
      </div>
    </header>
  );
}
