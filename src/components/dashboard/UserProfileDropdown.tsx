'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

import { ChevronDown, LogOut, Settings, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';


export function UserProfileDropdown() {
  const { user, logout, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        aria-expanded={isOpen}
        aria-haspopup="menu"

      >
        {/* Avatar — real initials from user, or skeleton ring while loading */}
        <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-body-sm font-bold shadow-sm shrink-0">
          {isLoading ? (
            <span className="w-3 h-3 rounded-full border-2 border-white/60 border-t-white animate-spin" />
          ) : (
            getInitials(user?.name)
          )}
        </div>
        
        {/* User info — only rendered once auth has resolved */}
        {!isLoading && user && (
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-body-sm font-semibold text-neutral-800 leading-none">
              {user.name}
            </span>
            {user.email && (
              <span className="text-[10px] text-neutral-500 leading-none mt-0.5">
                {user.email}
              </span>
            )}
          </div>
        )}
        {/* Skeleton name lines while loading */}
        {isLoading && (
          <div className="hidden sm:flex flex-col gap-1">
            <div className="w-20 h-2.5 rounded bg-neutral-200 animate-pulse" />
            <div className="w-28 h-2 rounded bg-neutral-100 animate-pulse" />
          </div>
        )}

        <ChevronDown size={16} className={cn("text-neutral-500 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-neutral-100 focus:outline-none z-50 animate-fade-in">
          {/* User Details Header (mobile only) — real data only */}
          {user && (
            <div className="px-4 py-3 sm:hidden">
              <p className="text-body-sm font-semibold text-neutral-800 truncate">{user.name}</p>
              {user.email && (
                <p className="text-[11px] text-neutral-500 truncate">{user.email}</p>
              )}
            </div>
          )}

          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-body-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <Settings size={16} className="text-neutral-500" />
              <span>Account Settings</span>
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2 px-4 py-2 text-body-sm text-neutral-700 hover:bg-neutral-100 transition-colors text-left"
            >
              <HelpCircle size={16} className="text-neutral-500" />
              <span>Help & Support</span>
            </button>
          </div>

          <div className="py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-body-sm text-red-600 hover:bg-red-50 transition-colors text-left font-medium"
            >
              <LogOut size={16} className="text-red-500" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
