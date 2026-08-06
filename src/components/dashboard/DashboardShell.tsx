'use client';

import React, { useState } from 'react';
import { TopNav } from '@/components/dashboard/TopNav';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { cn } from '@/lib/utils';

// DashboardShell is a client component that manages the interactive sidebar/topnav shell.
// The user layout itself remains a Server Component so child pages keep RSC benefits.
// Collapse state is read from a cookie server-side (DashboardLayout) and passed in as
// initialCollapsed, so the very first render — server and client — is already correct.
// This replaces the previous localStorage + effect approach, which could only correct
// itself after mount and caused a visible expanded-then-collapsed flash on reload.
export function DashboardShell({ children, initialCollapsed }: { children: React.ReactNode; initialCollapsed: boolean }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const handleToggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    document.cookie = `sidebar_collapsed=${newState}; path=/; max-age=31536000; SameSite=Lax`;
  };

  return (
    <div className="dashboard-shell flex flex-col min-h-screen bg-white">
      {/* Top Navbar */}
      <TopNav />

      {/* Mobile: documented horizontal, scrollable navigation below the top bar. */}
      <div className="dashboard-mobile-nav fixed left-0 right-0 top-[56px] z-20 h-[52px] bg-neutral-50 border-b border-neutral-200">
        <Sidebar isMobile />
      </div>

      {/* Main Container */}
      <div className="dashboard-main-frame flex min-h-[calc(100vh-56px)]">
        {/* Desktop/tablet Sidebar */}
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

        {/* Content Area */}
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
