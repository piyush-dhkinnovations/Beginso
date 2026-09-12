'use client';

import Link from 'next/link';
import { FileInput, MessageSquare, Plus } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { formatResponseDate } from '@/lib/formatters';
import type { DashboardActivity } from '@/types/dashboard';

interface RecentActivitySectionProps {
  hasForms?: boolean;
  activities?: DashboardActivity[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function RecentActivitySection({
  hasForms = false,
  activities = [],
  isLoading = false,
  isError = false,
  onRetry,
}: RecentActivitySectionProps) {
  return (
    <section
      aria-labelledby="recent-activity-heading"
      className="bg-card bg-card-pad space-y-4"
    >
      <h3 id="recent-activity-heading" className="text-heading-2 text-text-primary font-bold">
        Recent Activity
      </h3>

      {isLoading ? (
        <div aria-busy="true" aria-label="Loading recent activity" className="divide-y divide-[var(--border-subtle)]">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex min-h-16 items-center gap-3 py-3">
              <div className="bg-skeleton bg-skeleton-circle h-10 w-10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="bg-skeleton h-3 w-48 max-w-full" />
                <div className="bg-skeleton h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="flex min-h-32 flex-col items-center justify-center gap-3 text-center">
          <div>
            <p className="text-body-sm font-semibold text-text-primary">Unable to load recent activity</p>
            <p className="mt-1 text-caption text-text-muted">Please try again when the dashboard service is available.</p>
          </div>
          {onRetry && (
            <Button variant="secondary" size="small" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      ) : activities.length > 0 ? (
        <ul className="divide-y divide-[var(--border-subtle)]" aria-label="Latest workspace activity">
          {activities.map((activity) => (
            <li key={activity.id}>
              <Link
                href={`/responses?responseId=${encodeURIComponent(activity.responseId)}`}
                className="group flex min-h-16 items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                aria-label={`View response for ${activity.form.title}`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-soft-text)]"
                >
                  <MessageSquare size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm font-semibold text-text-primary">
                    New response submitted
                  </span>
                  <span className="block truncate text-caption text-text-muted">
                    {activity.form.title || 'Untitled form'}
                  </span>
                </span>
                <time
                  dateTime={activity.occurredAt}
                  className="shrink-0 text-caption text-text-muted"
                  title={formatResponseDate(activity.occurredAt)}
                >
                  {formatResponseDate(activity.occurredAt)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<FileInput size={24} />}
          heading={hasForms ? 'No recent activity' : 'No forms created yet'}
          body={hasForms ? 'New form responses will appear here.' : 'Get started by creating your first Beginso form.'}
          action={
            hasForms ? undefined : (
              <Link href="/forms">
                <Button variant="primary" className="flex items-center gap-2">
                  <Plus size={16} />
                  <span>Create your first form</span>
                </Button>
              </Link>
            )
          }
        />
      )}
    </section>
  );
}
