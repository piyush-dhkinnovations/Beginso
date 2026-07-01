'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-display text-neutral-900">Dashboard</h1>
          <p className="text-body text-neutral-500">
            Welcome back, {user?.name || 'Admin'} ({user?.email})
          </p>
        </div>
        <Button variant="secondary" onClick={logout}>
          Log Out
        </Button>
      </div>

      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-8 text-center flex flex-col items-center justify-center gap-4">
        <h2 className="text-heading-1 text-neutral-800">Dashboard coming soon — Sprint 2</h2>
        <p className="text-body text-neutral-600 max-w-md">
          This placeholder page will be replaced in Sprint 2 with full dashboard functionalities, onboarding workflows, form builders, and analytics.
        </p>
      </div>
    </div>
  );
}
