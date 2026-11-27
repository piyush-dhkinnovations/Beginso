import React from 'react';
import { Wordmark } from '@/components/landing/Wordmark';

// A minimal centred layout: this route needs an authenticated session
// (unlike (auth)'s logged-out pages) but is deliberately outside (user)'s app shell and sidebar
// chrome, since onboarding is a focused, one-time step, not a page within the normal app shell.
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-(--bg-subtle) py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="w-full max-w-xl flex flex-col gap-6">
        <div className="flex justify-center">
          {/* The light-surface wordmark is forced in every theme, although bg-(--bg-subtle) follows the theme. */}
          <Wordmark force="light" height={32} />
        </div>
        {children}
      </div>
    </div>
  );
}
