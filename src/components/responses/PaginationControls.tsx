'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

export function PaginationControls({ page, totalPages, onPageChange }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4">
      <Button
        variant="secondary"
        size="small"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-disabled={page === 1}
      >
        <ChevronLeft size={16} className="mr-1" />
        Previous
      </Button>
      <span className="bg-body-sm text-(--text-muted)">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="secondary"
        size="small"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-disabled={page === totalPages}
      >
        Next
        <ChevronRight size={16} className="ml-1" />
      </Button>
    </div>
  );
}
