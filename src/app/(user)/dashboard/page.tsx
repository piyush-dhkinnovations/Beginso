'use client';

import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { formsService } from '@/services/forms';
import { responsesService } from '@/services/responses';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { WelcomeSection } from '@/components/dashboard/WelcomeSection';
import { StatisticsCards } from '@/components/dashboard/StatisticsCards';
import { QuickActionsSection } from '@/components/dashboard/QuickActionsSection';
import { RecentActivitySection } from '@/components/dashboard/RecentActivitySection';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const { data: dashboardStats, isLoading: statsLoading, isError: isStatsError, refetch } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const [allForms, publishedForms, responseStats] = await Promise.all([
        formsService.getForms({ page: 1, limit: 1 }),
        formsService.getForms({ status: 'published', page: 1, limit: 1 }),
        responsesService.getStats(),
      ]);
      return {
        totalForms: allForms.total,
        totalResponses: responseStats.total,
        publishedForms: publishedForms.total,
        // The current backend contract has no date-scoped response count. A dash is honest;
        // zero would falsely claim there were no submissions this month.
        responsesThisMonth: null,
      };
    },
    // Don't fetch until auth has finished loading AND actually succeeded —
    // otherwise a stale/missing session can render the dashboard shell for a
    // frame before the axios interceptor's 401 redirect fires.
    enabled: !authLoading && isAuthenticated,
  });

  // If AuthContext is verifying the session, render full page overlay loader
  if (authLoading) {
    return <LoadingSpinner variant="overlay" />;
  }

  const hasForms = (dashboardStats?.totalForms ?? 0) > 0;

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
      {isStatsError ? (
        <Card role="alert" className="flex items-center justify-between gap-4">
          <div>
            <p className="text-body-sm font-semibold text-neutral-900">Unable to load dashboard totals</p>
            <p className="mt-1 text-caption text-neutral-500">No values were replaced with misleading zeroes.</p>
          </div>
          <Button variant="secondary" size="small" onClick={() => void refetch()}>Try again</Button>
        </Card>
      ) : (
        <StatisticsCards isLoading={statsLoading} counts={dashboardStats} />
      )}

      {/* Quick Actions */}
      <QuickActionsSection />

      {/* Recent Activity */}
      <RecentActivitySection
        hasForms={hasForms}
      />
    </div>
  );
}
