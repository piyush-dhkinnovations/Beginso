'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FileText,
  LayoutTemplate,
  Table2,
  PieChart,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBuilderStore } from '@/store/builderStore';

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
  const dirty = useBuilderStore((state) => state.dirty);
  const setPendingLeaveUrl = useBuilderStore((state) => state.setPendingLeaveUrl);
  // Only the builder route holds unsaved state the rest of the app cares about —
  // gating on pathname too (not just `dirty`) keeps a stale dirty flag from a
  // previous builder session from blocking navigation everywhere else.
  const isInBuilder = pathname.startsWith('/forms/') && pathname.endsWith('/edit');

  // Icon choice matches the design system's sidebar-nav vocabulary (04_Design_System.md §4.8):
  // home, file-text, layout, table, pie-chart, download, settings.
  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Forms', href: '/forms', icon: FileText },
    { name: 'Templates', href: '/templates', icon: LayoutTemplate },
    { name: 'Responses', href: '/responses', icon: Table2 },
    { name: 'Analytics', href: '/analytics', icon: PieChart },
    { name: 'Reports', href: '/reports', icon: Download },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isItemActive = (href: string) =>
    pathname === href ||
    pathname.startsWith(href + '/') ||
    (href === '/responses' && /^\/forms\/[^/]+\/responses(\/|$)/.test(pathname)) ||
    (href === '/analytics' && /^\/forms\/[^/]+\/analytics(\/|$)/.test(pathname));

  const handleNavigation = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isInBuilder && dirty) {
      event.preventDefault();
      setPendingLeaveUrl(href);
      return;
    }
    onCloseMobile?.();
  };

  if (isMobile) {
    return (
      <nav aria-label="Mobile navigation" className="h-full overflow-x-auto px-2">
        <div className="flex h-full min-w-max items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={false}
                onClick={(event) => handleNavigation(event, item.href)}
                className={cn(
                  'flex min-h-11 items-center gap-2 rounded-md px-3 text-body-sm whitespace-nowrap',
                  isActive ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-neutral-600 hover:bg-neutral-100'
                )}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <aside
      className={cn(
        "dashboard-sidebar-panel flex flex-col h-full bg-neutral-50 border-r-[2.5px] border-neutral-200 transition-all duration-300 ease-in-out",
        collapsed ? "w-[56px]" : "w-[200px]"
      )}
    >
      {/* Sidebar Header/Logo slot */}
      <div className={cn(
        "h-[56px] border-b border-neutral-200 flex items-center px-3 shrink-0",
        collapsed && !isMobile ? "justify-center" : "justify-between"
      )}>
        {(!collapsed || isMobile) ? (
          <>
            <Link
              href="/dashboard"
              prefetch={false}
              className="sidebar-brand flex min-h-11 items-center gap-2 overflow-hidden"
              onClick={(event) => handleNavigation(event, '/dashboard')}
            >
              <div className="w-8 h-8 rounded bg-brand-600 flex items-center justify-center text-white font-bold shrink-0">
                B
              </div>
              <span className="text-body font-bold text-neutral-800 tracking-tight whitespace-nowrap">
                Beginso
              </span>
            </Link>
            {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="sidebar-collapse-control p-1 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors shrink-0 flex items-center justify-center min-h-11 min-w-11"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft size={20} />
                </button>
            )}
          </>
        ) : (
          !isMobile && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors shrink-0 flex items-center justify-center min-h-11 min-w-11"
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
          // The Responses/Analytics nav items also cover /forms/[id]/responses and
          // /forms/[id]/analytics — reached from the Forms Manager, not the sidebar link itself.
          const isActive = isItemActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={false}
              onClick={(event) => handleNavigation(event, item.href)}
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
                <span className="sidebar-label text-body-sm whitespace-nowrap overflow-hidden text-ellipsis">
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
