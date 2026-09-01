'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { TopNav } from '@/components/dashboard/TopNav';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// DashboardShell is a client component that manages the interactive sidebar/topnav shell.
// The user layout itself remains a Server Component so child pages keep RSC benefits.
// Collapse state is read from a cookie server-side (DashboardLayout) and passed in as
// initialCollapsed, so the very first render — server and client — is already correct.
// This replaces the previous localStorage + effect approach, which could only correct
// itself after mount and caused a visible expanded-then-collapsed flash on reload.
export function DashboardShell({ children, initialCollapsed }: { children: React.ReactNode; initialCollapsed: boolean }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const handleToggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    document.cookie = `sidebar_collapsed=${newState}; path=/; max-age=31536000; SameSite=Lax`;
  };

  // Close on Escape; trap Tab/Shift+Tab focus within the drawer — same pattern as Modal.tsx.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);

    getFocusable()[0]?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = previousBodyOverflow;
      opener?.focus();
    };
  }, [mobileMenuOpen]);

  // Proxy is the server-side boundary; this client guard prevents a cached shell
  // from remaining visible during logout or while a failed session redirects.
  if (authLoading || !isAuthenticated) {
    return <LoadingSpinner variant="overlay" />;
  }

  return (
    <div className="dashboard-shell flex flex-col min-h-screen bg-white">
      <TopNav onMenuClick={() => setMobileMenuOpen(true)} />

      {/* Mobile nav drawer — trigger lives in TopNav, only visible below the shell's 520px
          container breakpoint (see .dashboard-mobile-menu-btn in globals.css). */}
      {mobileMenuOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-40 bg-neutral-900/40 animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            // Width matches Sidebar's own non-collapsed w-[200px] exactly — Sidebar's <aside>
            // already supplies its own opaque background and right border, so a wider wrapper
            // here left a visible strip of extra white space plus a duplicate-looking border
            // (the "2 overlapping cards" look) instead of the aside filling the drawer flush.
            className="absolute left-0 top-0 bottom-0 w-[200px] max-w-[80vw] shadow-2xl animate-slide-in-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="absolute top-2.5 right-2.5 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <X size={18} />
            </button>
            <Sidebar onCloseMobile={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="dashboard-main-frame flex min-h-[calc(100vh-56px)]">
        <div
          className={cn(
            "dashboard-desktop-sidebar fixed left-0 top-[56px] bottom-0 z-20 transition-all duration-300 ease-in-out",
            collapsed ? "w-[56px]" : "w-[200px]"
          )}
        >
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={handleToggleCollapse}
          />
        </div>

        <main
          className={cn(
            "dashboard-content flex-1 p-6 overflow-y-auto min-h-full transition-all duration-300 ease-in-out",
            collapsed ? "ml-[56px]" : "ml-[200px]"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
