'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Plus } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { PaginationControls } from '@/components/responses/PaginationControls';
import { computeChangePercent, formatChangeLabel } from '@/lib/analyticsChange';
import type { AnalyticsFormsSummaryResult, AnalyticsFormSummary } from '@/types/analytics';

const STATUS_LABEL: Record<AnalyticsFormSummary['status'], string> = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Closed',
};

interface FormsSummaryTableProps {
  data?: AnalyticsFormsSummaryResult;
  /** Same forms, previous-period totals — used only to compute the Change column. Absent (e.g.
   * "All time", where there's no meaningful previous period) means every row shows "—". */
  previousForms?: AnalyticsFormSummary[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  page: number;
  onPageChange: (page: number) => void;
}

export function FormsSummaryTable({
  data,
  previousForms,
  isLoading,
  isError = false,
  onRetry,
  page,
  onPageChange,
}: FormsSummaryTableProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-neutral-100 last:border-0 animate-pulse">
            <div className="h-4 flex-1 bg-neutral-100 rounded" />
            <div className="h-5 w-20 bg-neutral-100 rounded-full" />
            <div className="h-4 w-12 bg-neutral-100 rounded" />
            <div className="hidden md:block h-4 w-16 bg-neutral-100 rounded" />
            <div className="hidden md:block h-4 w-12 bg-neutral-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="flex min-h-28 items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-6">
        <div>
          <p className="text-body-sm font-semibold text-neutral-900">Unable to load form totals</p>
          <p className="mt-1 text-caption text-neutral-500">Please try again.</p>
        </div>
        {onRetry && <Button variant="secondary" size="small" onClick={onRetry}>Try again</Button>}
      </div>
    );
  }

  const forms = data?.forms ?? [];

  if (forms.length === 0) {
    return (
      <EmptyState
        icon={<FileText />}
        heading="No forms yet"
        body="Create a form to start seeing its analytics here."
        action={
          <Link href="/forms">
            <Button variant="primary">
              <Plus size={16} className="mr-2" />
              Create Form
            </Button>
          </Link>
        }
      />
    );
  }

  const previousByFormId = new Map(previousForms?.map((f) => [f._id, f.totalResponses]));
  const changeFor = (form: AnalyticsFormSummary) => {
    const previous = previousByFormId.get(form._id);
    return formatChangeLabel(previous === undefined ? null : computeChangePercent(form.totalResponses, previous));
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const goToForm = (formId: string) => router.push(`/forms/${formId}/analytics`);

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden sm:block bg-white border border-neutral-200 rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200 text-caption font-semibold text-neutral-500 uppercase tracking-wider">
              <th className="px-4 py-2.5">Form</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Responses</th>
              <th className="hidden md:table-cell px-4 py-2.5 text-right">Change</th>
              <th className="hidden md:table-cell px-4 py-2.5 text-right">Completion Rate</th>
            </tr>
          </thead>
          <tbody>
            {forms.map((form) => (
              <tr
                key={form._id}
                onClick={() => goToForm(form._id)}
                className="hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0"
              >
                <td className="px-4 py-3 text-body-sm font-semibold text-neutral-800 truncate max-w-[280px]">{form.title}</td>
                <td className="px-4 py-3">
                  <StatusBadge variant={form.status}>{STATUS_LABEL[form.status]}</StatusBadge>
                </td>
                <td className="px-4 py-3 text-body-sm text-neutral-600 text-right">{form.totalResponses}</td>
                <td className="hidden md:table-cell px-4 py-3 text-body-sm text-neutral-600 text-right">{changeFor(form)}</td>
                <td className="hidden md:table-cell px-4 py-3 text-body-sm text-neutral-600 text-right">
                  {Math.round(form.completionRate)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden flex flex-col gap-3">
        {forms.map((form) => (
          <button
            key={form._id}
            type="button"
            onClick={() => goToForm(form._id)}
            className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4 text-left shadow-sm hover:bg-neutral-50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-body-sm font-semibold text-neutral-800 truncate">{form.title}</span>
              <StatusBadge variant={form.status}>{STATUS_LABEL[form.status]}</StatusBadge>
            </div>
            <span className="text-caption text-neutral-500">
              {form.totalResponses} response{form.totalResponses === 1 ? '' : 's'} · {Math.round(form.completionRate)}% completion · {changeFor(form)}
            </span>
          </button>
        ))}
      </div>

      <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
