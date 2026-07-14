'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FileText,
  Table2,
  PieChart,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  isMobile = false,
  onCloseMobile
}: SidebarProps) {
  const pathname = usePathname();

  // Icon choice matches the design system's sidebar-nav vocabulary (04_Design_System.md §4.8):
  // home, file-text, layout, table, pie-chart, download, settings — "layout" is reserved for
  // the not-yet-built Templates nav item (Thursday's task 4.7).
  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Forms', href: '/forms', icon: FileText },
    { name: 'Responses', href: '/responses', icon: Table2 },
    { name: 'Analytics', href: '/analytics', icon: PieChart },
    { name: 'Reports', href: '/reports', icon: Download },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-neutral-50 border-r-[2.5px] border-neutral-200 transition-all duration-300 ease-in-out",
        isMobile ? "w-[240px] fixed inset-y-0 left-0 z-50 shadow-xl animate-slide-in-left" : (collapsed ? "w-[56px]" : "w-[200px]")
      )}
    >
      {/* Sidebar Header/Logo slot */}
      <div className={cn(
        "h-[56px] border-b border-neutral-200 flex items-center px-3 shrink-0",
        collapsed && !isMobile ? "justify-center" : "justify-between"
      )}>
        {(!collapsed || isMobile) ? (
          <>
            <Link href="/dashboard" prefetch={false} className="flex items-center gap-2 overflow-hidden" onClick={onCloseMobile}>
              <div className="w-8 h-8 rounded bg-brand-600 flex items-center justify-center text-white font-bold shrink-0">
                OP
              </div>
              <span className="text-body font-bold text-neutral-800 tracking-tight whitespace-nowrap">
                Beginso
              </span>
            </Link>
            {isMobile && onCloseMobile ? (
              <button
                onClick={onCloseMobile}
                className="p-1 rounded-md text-neutral-500 hover:bg-neutral-200 transition-colors md:hidden"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            ) : (
              !isMobile && onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="p-1 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors shrink-0 flex items-center justify-center min-h-[32px] min-w-[32px]"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft size={20} />
                </button>
              )
            )}
          </>
        ) : (
          !isMobile && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors shrink-0 flex items-center justify-center min-h-[32px] min-w-[32px]"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={20} />
            </button>
          )
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={false}
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-3 px-3 rounded-md min-h-[44px] transition-all duration-150 ease-in-out",
                isActive
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-neutral-600 hover:bg-neutral-100"
              )}
              title={collapsed && !isMobile ? item.name : undefined}
            >
              <Icon size={16} className={cn("shrink-0", isActive ? "text-brand-700" : "text-neutral-500")} />
              {(!collapsed || isMobile) && (
                <span className="text-body-sm whitespace-nowrap overflow-hidden text-ellipsis">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
