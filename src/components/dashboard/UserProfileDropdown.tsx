'use client';

import { localAvatarSrc } from '@/lib/avatarUrl';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';

import { ChevronsUpDown, FileText, LogOut, Settings, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initialsOf } from '@/lib/formatters';


export interface UserProfileDropdownProps {
  /** `avatar`: just the photo/initials (top bar). `sidebar`: avatar + name + email, pinned to the sidebar's bottom edge. */
  variant?: 'avatar' | 'sidebar';
  /** Sidebar variant only: the icon rail shows the avatar alone. */
  collapsed?: boolean;
}

export function UserProfileDropdown({ variant = 'avatar', collapsed = false }: UserProfileDropdownProps = {}) {
  const inSidebar = variant === 'sidebar';
  const showText = inSidebar && !collapsed;
  const { user, logout, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Shares the cache Settings' ProfileTab/AvatarUploader populate and invalidate — AuthContext's
  // User type deliberately doesn't carry avatarUrl (design.md §2), so this reads it separately.
  const { data: profile } = useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: settingsService.getProfile,
    enabled: !!user,
  });

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

  // In the sidebar the menu is `fixed`, placed from the trigger's rect: the sidebar scrolls (overflow clips
  // absolute children) and the collapsed rail is only 64px wide, so a menu sized to the sidebar got squashed.
  const [anchor, setAnchor] = useState<{ left: number; bottom: number } | null>(null);
  const toggleDropdown = () => {
    if (inSidebar && !isOpen && dropdownRef.current) {
      const r = dropdownRef.current.getBoundingClientRect();
      setAnchor({ left: r.left, bottom: window.innerHeight - r.top + 8 });
    }
    setIsOpen((prev) => !prev);
  };

  const getInitials = (name?: string) => initialsOf(name) || 'U';

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className={cn(
          'flex min-h-11 items-center gap-2 p-1.5 rounded-lg hover:bg-(--surface-hover) transition-colors focus:outline-none focus:ring-2 focus:ring-(--border-focus)/20',
          showText && 'w-full',
        )}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={user?.name ? `Account menu for ${user.name}` : 'Account menu'}

      >
        {/* Avatar — real photo if uploaded, initials fallback, or skeleton ring while loading */}
        <div className="w-8 h-8 rounded-full bg-(--action-primary) text-(--text-on-brand) flex items-center justify-center bg-body-sm font-bold shadow-(--shadow-sm) shrink-0 overflow-hidden">
          {isLoading ? (
            <span className="w-3 h-3 rounded-full border-2 border-(--text-on-brand)/40 border-t-(--text-on-brand) animate-spin" />
          ) : profile?.avatarUrl && failedAvatar !== profile.avatarUrl ? (
            // referrerPolicy: Google's photo host rejects hot-linked requests that carry a Referer.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={localAvatarSrc(profile.avatarUrl)} alt="" referrerPolicy="no-referrer" onError={() => setFailedAvatar(profile.avatarUrl ?? null)} className="h-full w-full object-cover" />
          ) : (
            getInitials(user?.name)
          )}
        </div>
        
        {showText && !isLoading && user && (
          <div className="flex min-w-0 flex-1 flex-col text-left">
            <span className="truncate bg-body-sm font-semibold text-(--text-primary) leading-tight">
              {user.name}
            </span>
            {user.email && (
              <span className="truncate bg-caption text-(--text-muted) leading-tight mt-0.5">
                {user.email}
              </span>
            )}
          </div>
        )}
        {showText && isLoading && (
          <div className="flex flex-col gap-1">
            <div className="w-20 h-2.5 rounded bg-(--surface-hover) animate-pulse" />
            <div className="w-28 h-2 rounded bg-(--surface-hover) animate-pulse" />
          </div>
        )}

        {showText && (
          <ChevronsUpDown size={14} className="ml-auto shrink-0 text-(--text-muted)" aria-hidden="true" />
        )}
      </button>

      {isOpen && (
        <div className={cn(
          'rounded-md border border-(--border-default) shadow-(--shadow-lg) bg-(--surface-card) divide-y divide-(--border-default) focus:outline-none z-50 animate-fade-in',
          // In the sidebar the menu is exactly as wide as the sidebar's own padding box, so the overflow clip never cuts it.
          inSidebar ? 'fixed w-60' : 'absolute right-0 mt-2 w-56',
        )}
          style={inSidebar && anchor ? { left: anchor.left, bottom: anchor.bottom } : undefined}
        >
          {user && (
            <div className="px-4 py-3">
              <p className="bg-body-sm font-semibold text-(--text-primary) truncate">{user.name}</p>
              {user.email && (
                <p className="bg-caption text-(--text-muted) truncate">{user.email}</p>
              )}
            </div>
          )}

          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-center gap-2 px-4 py-2 bg-body-sm text-(--text-primary) hover:bg-(--surface-hover) transition-colors"
            >
              <Settings size={16} className="text-(--text-muted)" />
              <span>Account Settings</span>
            </Link>
          </div>

          <div className="py-1">
            <Link
              href="/terms"
              target="_blank"
              rel="noopener"
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-center gap-2 px-4 py-2 bg-body-sm text-(--text-primary) hover:bg-(--surface-hover) transition-colors"
            >
              <FileText size={16} className="text-(--text-muted)" />
              <span>Terms of Use</span>
            </Link>
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener"
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-center gap-2 px-4 py-2 bg-body-sm text-(--text-primary) hover:bg-(--surface-hover) transition-colors"
            >
              <Shield size={16} className="text-(--text-muted)" />
              <span>Privacy Policy</span>
            </Link>
          </div>

          <div className="py-1">
            <button
              onClick={handleLogout}
              className="w-full min-h-11 flex items-center gap-2 px-4 py-2 bg-body-sm text-(--error-text) hover:bg-(--error-surface) transition-colors text-left font-medium"
            >
              <LogOut size={16} className="text-(--error)" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
