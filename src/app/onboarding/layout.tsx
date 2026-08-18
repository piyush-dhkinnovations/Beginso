import React from 'react';

// Mirrors (auth)/layout.tsx's minimal centered style — this route needs an authenticated session
// (unlike (auth)'s logged-out pages) but is deliberately outside (user)'s DashboardShell/Sidebar
// chrome, since onboarding is a focused, one-time step, not a page within the normal app shell.
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="w-full max-w-[440px] flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-display text-neutral-900">Beginso</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
