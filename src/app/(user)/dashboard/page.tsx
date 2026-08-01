'use client';

import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { formsService } from '@/services/forms';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { WelcomeSection } from '@/components/dashboard/WelcomeSection';
import { StatisticsCards } from '@/components/dashboard/StatisticsCards';
import { QuickActionsSection } from '@/components/dashboard/QuickActionsSection';
import { RecentActivitySection } from '@/components/dashboard/RecentActivitySection';

export default function DashboardPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  // Fetch real forms data to derive statistics
  const { data: formsData, isLoading: formsLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: () => formsService.getForms(),
    // Don't fetch until auth has finished loading AND actually succeeded —
    // otherwise a stale/missing session can render the dashboard shell for a
    // frame before the axios interceptor's 401 redirect fires.
    enabled: !authLoading && isAuthenticated,
  });

  // If AuthContext is verifying the session, render full page overlay loader
  if (authLoading) {
    return <LoadingSpinner variant="overlay" />;
  }

  // Derive real statistics from the fetched forms list
  const forms = formsData?.forms ?? [];

  const realCounts = {
    totalForms: formsData?.total ?? 0,
    totalResponses: forms.reduce((sum, f) => sum + (f.responseCount ?? 0), 0),
    publishedForms: forms.filter((f) => f.status === 'published').length,
    // ponytail: Cannot compute responsesThisMonth accurately from Form[] without time-series data.
    // Upgrade path: Backend should return a dedicated aggregate stat for this.
    // Falling back to 0 for MVP to avoid misleading data.
    responsesThisMonth: 0,
  };

  const hasForms = forms.length > 0;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Header */}
      <DashboardHeader
        title="Dashboard"
        subtitle="Manage and analyze Beginso pipeline interactions."
      />

      {/* Welcome Widget */}
      <WelcomeSection />

      {/* Statistics Cards — driven by real API data */}
      <StatisticsCards
        isLoading={formsLoading}
        counts={realCounts}
      />

      {/* Quick Actions */}
      <QuickActionsSection />

      {/* Recent Activity */}
      <RecentActivitySection
        hasForms={hasForms}
      />
    </div>
  );
}
