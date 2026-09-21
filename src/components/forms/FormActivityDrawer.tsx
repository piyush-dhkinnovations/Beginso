'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Drawer } from '@/components/ui/Drawer';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { eventsService } from '@/services/events';
import { formEventKeys } from '@/lib/queryKeys';
import { FormEventRows } from './FormActivityCard';

const DRAWER_PAGE_SIZE = 20;

export interface FormActivityDrawerProps {
  formId: string;
  isOpen: boolean;
  onClose: () => void;
}

// requirements.md §7.5's "View all" (shape left to the implementer; design.md §6 picks ui/Drawer).
// Fetches only while open. The events contract returns a bare array with no total, so paging is
// Previous/Next, and Next is offered only when a full page came back.
export function FormActivityDrawer({ formId, isOpen, onClose }: FormActivityDrawerProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: formEventKeys.list(formId, page, DRAWER_PAGE_SIZE),
    queryFn: () => eventsService.listFormEvents(formId, page, DRAWER_PAGE_SIZE),
    enabled: isOpen,
  });

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Form activity" description="Everything that has happened on this form.">
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="text" width="100%" height={16} />
          ))}
        </div>
      ) : isError ? (
        <Alert variant="error" title="Could not load activity.">
          <Button variant="secondary" size="small" onClick={() => void refetch()}>
            Retry
          </Button>
        </Alert>
      ) : (
        <div className="flex flex-col gap-4">
          <FormEventRows events={data ?? []} />
          <div className="flex items-center justify-between">
            <Button variant="secondary" size="small" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="secondary"
              size="small"
              disabled={(data?.length ?? 0) < DRAWER_PAGE_SIZE}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
