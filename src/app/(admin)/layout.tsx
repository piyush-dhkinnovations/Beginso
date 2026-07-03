'use client';

import React, { useState, useEffect } from 'react';
import { TopNav } from '@/components/dashboard/TopNav';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem('sidebar_collapsed');
    if (stored === 'true') {
      setCollapsed(true);
    }
  }, []);

  const handleToggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', String(newState));
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
            isMounted 
              ? (collapsed ? "md:ml-[56px]" : "md:ml-[200px]")
              : "md:ml-[200px]" // fallback before hydration
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

