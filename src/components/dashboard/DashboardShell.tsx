'use client';

import React, { useState } from 'react';
import { TopNav } from '@/components/dashboard/TopNav';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { cn } from '@/lib/utils';

// DashboardShell is a client component that manages the interactive sidebar/topnav shell.
// The admin layout itself remains a Server Component so child pages keep RSC benefits.
// Collapse state is read from a cookie server-side (DashboardLayout) and passed in as
// initialCollapsed, so the very first render — server and client — is already correct.
// This replaces the previous localStorage + effect approach, which could only correct
// itself after mount and caused a visible expanded-then-collapsed flash on reload.
export function DashboardShell({ children, initialCollapsed }: { children: React.ReactNode; initialCollapsed: boolean }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    document.cookie = `sidebar_collapsed=${newState}; path=/; max-age=31536000; SameSite=Lax`;
  };

  const handleToggleMobileSidebar = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleCloseMobileSidebar = () => {
    setMobileOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Top Navbar */}
      <TopNav onToggleMobileSidebar={handleToggleMobileSidebar} />

      {/* Main Container */}
      <div className="flex pt-[56px] min-h-[calc(100vh-56px)]">
        {/* Desktop Sidebar (hidden on mobile) */}
        <div
          className={cn(
            "fixed left-0 top-[56px] bottom-0 z-20 hidden md:block transition-all duration-300 ease-in-out",
            collapsed ? "w-[56px]" : "w-[200px]"
          )}
        >
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={handleToggleCollapse}
          />
        </div>

        {/* Mobile Sidebar (Drawer with Backdrop) */}
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-neutral-900/40 z-40 md:hidden animate-fade-in"
              onClick={handleCloseMobileSidebar}
            />
            {/* Sidebar container */}
            <div className="fixed inset-y-0 left-0 z-50 md:hidden">
              <Sidebar
                isMobile
                onCloseMobile={handleCloseMobileSidebar}
              />
            </div>
          </>
        )}

        {/* Content Area */}
        <main
          className={cn(
            "flex-1 p-6 overflow-y-auto min-h-full transition-all duration-300 ease-in-out",
            "ml-0", // mobile default
            collapsed ? "md:ml-[56px]" : "md:ml-[200px]"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
