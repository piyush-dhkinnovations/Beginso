'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { ResponseRow } from './ResponseRow';
import type { IResponse } from '@/types/response';

interface ResponsesTableProps {
  responses: IResponse[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectRow: (id: string, checked: boolean) => void;
  onViewResponse: (id: string) => void;
  onDeleteResponse: (id: string) => void;
  /** True when a search term is active — swaps the empty state to the "no match" variant. */
  hasActiveSearch?: boolean;
  onClearSearch?: () => void;
  /** Undefined on the all-forms view — the empty-state CTA falls back to "Go to Forms". */
  formId?: string;
}

function MasterCheckbox({ responses, selectedIds, onSelectAll }: Pick<ResponsesTableProps, 'responses' | 'selectedIds' | 'onSelectAll'>) {
  const ref = useRef<HTMLInputElement>(null);
  const allSelected = responses.length > 0 && selectedIds.size === responses.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = someSelected;
  }, [someSelected]);

  return (
    <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        checked={allSelected}
        onChange={(e) => onSelectAll(e.target.checked)}
        aria-label="Select all responses on this page"
        className="w-4 h-4"
      />
    </label>
  );
}

export function ResponsesTable({
  responses,
  isLoading,
  selectedIds,
  onSelectAll,
  onSelectRow,
  onViewResponse,
  onDeleteResponse,
  hasActiveSearch = false,
  onClearSearch,
  formId,
}: ResponsesTableProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="responses-table-container bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-neutral-100 last:border-0">
            <div className="responses-secondary-block h-4 w-4 bg-neutral-100 rounded animate-pulse" />
            <div className="h-4 w-28 bg-neutral-100 rounded animate-pulse" />
            <div className="h-4 w-20 bg-neutral-100 rounded-full animate-pulse" />
            <div className="responses-secondary-block h-4 flex-1 bg-neutral-100 rounded animate-pulse" />
            <div className="h-4 w-16 bg-neutral-100 rounded animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (responses.length === 0 && hasActiveSearch) {
    return (
      <EmptyState
        icon={<FileText />}
        heading="No responses match your search."
        body="Try a different search term."
        action={
          <button
            type="button"
            onClick={onClearSearch}
            className="min-h-11 px-2 text-brand-600 hover:underline text-body-sm font-medium"
          >
            Clear search
          </button>
        }
      />
    );
  }

  if (responses.length === 0) {
    return (
      <EmptyState
        icon={<FileText />}
        heading="No responses yet"
        body="Share your form link to start collecting submissions."
        action={
          formId ? (
            <Button variant="secondary" onClick={() => router.push(`/forms/${formId}/edit?tab=share`)}>
              Share Form
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => router.push('/forms')}>
              Go to Forms
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="responses-table-container bg-white border border-neutral-200 rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200 text-caption font-semibold text-neutral-500 uppercase tracking-wider">
            <th className="responses-secondary-column w-12 px-2 py-1.5">
              <MasterCheckbox responses={responses} selectedIds={selectedIds} onSelectAll={onSelectAll} />
            </th>
            <th className="px-4 py-2.5">
              <span className="responses-mobile-only">Respondent</span>
              <span className="responses-desktop-only">Submitted</span>
            </th>
            <th className="px-4 py-2.5">Status</th>
            <th className="responses-secondary-column px-4 py-2.5">Preview</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {responses.map((response) => (
            <ResponseRow
              key={response._id}
              response={response}
              isSelected={selectedIds.has(response._id)}
              onSelect={(checked) => onSelectRow(response._id, checked)}
              onView={() => onViewResponse(response._id)}
              onDelete={() => onDeleteResponse(response._id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
