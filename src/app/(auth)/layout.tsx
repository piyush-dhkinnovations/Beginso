import React from "react";

// The wordmark now lives inside each page's AuthCard (top-center), not floating above it — see
// src/components/auth/AuthCard.tsx. This wrapper just centers the card and provides the
// theme-aware page background (bg-[var(--bg-page)] — was hardcoded bg-neutral-50, which kept
// this whole surface light even when the card itself went dark under [data-theme="dark"]).
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-page)] py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="w-full max-w-[440px] flex flex-col gap-6">
        {children}
      </div>
    </div>
  );
}
