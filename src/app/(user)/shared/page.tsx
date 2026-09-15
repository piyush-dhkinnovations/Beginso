'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Users, Lock } from 'lucide-react';
import { sharedService } from '@/services/shared';
import { sharedKeys } from '@/lib/queryKeys';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { SharedFormCard } from '@/components/team/SharedFormCard';

// Shared with me (requirements.md §7.9, design.md §5/§15.6/§17) — Personal-space page, one
// useQuery(sharedKeys.list()), 2-column card grid. Deferred since Sprint 8 (that sprint's own
// design.md §15.10 built the copy but left the page itself for this sprint).
export default function SharedWithMePage() {
  const { data: shares, isLoading, isError, error, refetch } = useQuery({
    queryKey: sharedKeys.list(),
    queryFn: sharedService.list,
  });

  const isPermissionDenied = (error as { response?: { status?: number } })?.response?.status === 403;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Personal space"
        title="Shared with me"
        description="Forms people shared directly with you."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <Skeleton variant="title" width="70%" />
              <Skeleton variant="text" width="50%" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        isPermissionDenied ? (
          <EmptyState icon={<Lock className="bg-icon" aria-hidden="true" />} title="You do not have access." />
        ) : (
          <EmptyState
            icon={<Users className="bg-icon" aria-hidden="true" />}
            title="Something went wrong."
            actions={
              <Button variant="secondary" onClick={() => void refetch()}>
                Retry
              </Button>
            }
          />
        )
      ) : !shares || shares.length === 0 ? (
        <EmptyState
          icon={<Users className="bg-icon" aria-hidden="true" />}
          title="Nothing shared with you yet."
          description="When someone shares a form or invites you to collaborate outside a workspace, it will appear here."
          actions={
            <Link href="/dashboard">
              <Button variant="secondary">Back to Home</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {shares.map((share) => (
            <SharedFormCard key={share.id} item={share} />
          ))}
        </div>
      )}
    </div>
  );
}
