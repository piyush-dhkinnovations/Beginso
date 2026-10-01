import React from 'react';
import { Wordmark } from '@/components/landing/Wordmark';

// Mirrors (auth)/layout.tsx's minimal centered style — this route needs an authenticated session
// (unlike (auth)'s logged-out pages) but is deliberately outside (user)'s DashboardShell/Sidebar
// chrome, since onboarding is a focused, one-time step, not a page within the normal app shell.
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-(--bg-subtle) py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="w-full max-w-110 flex flex-col gap-6">
        <div className="flex justify-center">
          {/* Always a light surface (bg-(--bg-subtle), no dark variant) — see (auth)/layout.tsx's
              identical reasoning for forcing light rather than auto-swapping with the theme. */}
          <Wordmark force="light" height={32} />
        </div>
        {children}
      </div>
    </div>
  );
}
