'use client';

import { MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';

export default function ResponsesPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-fade-in">
      <DashboardHeader
        title="Responses"
        subtitle="Track, view, and organize submission data."
      />
      <EmptyState
        icon={<MessageSquare />}
        heading="View your form responses"
        body="Select a form from the Forms Manager to view and manage its submissions."
        action={
          <Button variant="primary" onClick={() => router.push('/forms')}>
            Go to Forms
          </Button>
        }
      />
    </div>
  );
}
