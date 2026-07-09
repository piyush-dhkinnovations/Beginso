'use client';

import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { UserCheck, FileInput, CheckCircle2, MessageSquare, AlertCircle, Plus } from 'lucide-react';
import Link from 'next/link';

export interface ActivityItem {
  id: string;
  description: string;
  timestamp: string;
  type: 'signup' | 'form_submission' | 'form_published' | 'system';
}

interface RecentActivitySectionProps {
  activities?: ActivityItem[];
  hasForms?: boolean;
}

export function RecentActivitySection({
  activities = [],
  hasForms = false
}: RecentActivitySectionProps) {
  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'signup':
        return <UserCheck className="text-blue-500" size={16} />;
      case 'form_submission':
        return <MessageSquare className="text-green-500" size={16} />;
      case 'form_published':
        return <CheckCircle2 className="text-indigo-500" size={16} />;
      default:
        return <AlertCircle className="text-neutral-500" size={16} />;
    }
  };

  if (!hasForms || activities.length === 0) {
    return (
      <div className="border border-neutral-200 rounded-lg p-6 bg-white space-y-4">
        <h3 className="text-heading-2 text-neutral-900 font-bold">Recent Activity</h3>
        <EmptyState
          icon={<FileInput size={24} />}
          heading="No forms created yet"
          body="Get started by creating your first Beginso form."
          action={
            <Link href="/forms">
              <Button variant="primary" className="flex items-center gap-2">
                <Plus size={16} />
                <span>Create your first form</span>
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 rounded-lg p-6 bg-white space-y-4">
      <h3 className="text-heading-2 text-neutral-900 font-bold">Recent Activity</h3>
      <div className="flow-root">
        <ul className="-mb-8">
          {activities.map((item, idx) => (
            <li key={item.id}>
              <div className="relative pb-8">
                {idx !== activities.length - 1 ? (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-neutral-200"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center ring-8 ring-white">
                      {getIcon(item.type)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <p className="text-body-sm text-neutral-800 font-medium">
                        {item.description}
                      </p>
                    </div>
                    <div className="text-right text-body-lg whitespace-nowrap text-neutral-500">
                      {item.timestamp}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
