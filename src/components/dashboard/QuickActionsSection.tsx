'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Plus, List, MessageSquare } from 'lucide-react';

export function QuickActionsSection() {
  return (
    <div className="space-y-4">
      <h3 className="text-heading-2 text-neutral-900 font-bold">Quick Actions</h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/forms" className="inline-block w-full sm:w-auto">
          <Button variant="primary" className="w-full sm:w-auto flex items-center justify-center gap-2">
            <Plus size={16} />
            <span>Create new form</span>
          </Button>
        </Link>

        <Link href="/forms" className="inline-block w-full sm:w-auto">
          <Button variant="secondary" className="w-full sm:w-auto flex items-center justify-center gap-2">
            <List size={16} />
            <span>View all forms</span>
          </Button>
        </Link>

        <Link href="/responses" className="inline-block w-full sm:w-auto">
          <Button variant="secondary" className="w-full sm:w-auto flex items-center justify-center gap-2">
            <MessageSquare size={16} />
            <span>View responses</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
