'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { WelcomeSection } from '@/components/dashboard/WelcomeSection';
import { StatisticsCards } from '@/components/dashboard/StatisticsCards';
import { QuickActionsSection } from '@/components/dashboard/QuickActionsSection';
import { RecentActivitySection } from '@/components/dashboard/RecentActivitySection';


export default function DashboardPage() {
  const { isLoading } = useAuth();

  // Demonstration states to allow the user/tester to toggle loading and empty states
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoHasNoForms, setDemoHasNoForms] = useState(false);

  // If AuthContext is verifying the session, render full page overlay loader
  if (isLoading) {
    return <LoadingSpinner variant="overlay" />;
  }

  // Define counts based on the demo state
  const mockCounts = demoHasNoForms ? {
    totalForms: 0,
    totalResponses: 0,
    publishedForms: 0,
    responsesThisMonth: 0
  } : {
    totalForms: 12,
    totalResponses: 148,
    publishedForms: 8,
    responsesThisMonth: 45
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Demo Controls - Helpful for QA to test Loading & Empty states */}
      <div className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-body-xs font-medium shrink-0">
        <span className="text-neutral-500 font-bold uppercase tracking-wider">QA Demo Controls:</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={demoLoading}
            onChange={(e) => setDemoLoading(e.target.checked)}
            className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
          />
          <span>Simulate Stats Load</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={demoHasNoForms}
            onChange={(e) => setDemoHasNoForms(e.target.checked)}
            className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
          />
          <span>Simulate Empty State (0 Forms)</span>
        </label>
      </div>

      {/* Header */}
      <DashboardHeader
        title="Dashboard"
        subtitle="Manage and analyze Beginso pipeline interactions."
      />

      {/* Welcome Widget */}
      <WelcomeSection />

      {/* Statistics Cards */}
      <StatisticsCards
        isLoading={demoLoading}
        counts={mockCounts}
      />

      {/* Quick Actions */}
      <QuickActionsSection />

      {/* Recent Activity */}
      <RecentActivitySection
        hasForms={!demoHasNoForms}
        activities={demoHasNoForms ? [] : undefined}
      />
    </div>
  );
}
