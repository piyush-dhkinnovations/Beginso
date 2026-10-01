'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Plus } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
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
      <div className="bg-(--surface-card) border border-(--border-default) rounded-xl overflow-hidden shadow-(--shadow-sm)">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-(--border-subtle) last:border-0 animate-pulse">
            <div className="h-4 flex-1 bg-(--bg-sunken) rounded" />
            <div className="h-5 w-20 bg-(--bg-sunken) rounded-full" />
            <div className="h-4 w-12 bg-(--bg-sunken) rounded" />
            <div className="hidden md:block h-4 w-16 bg-(--bg-sunken) rounded" />
            <div className="hidden md:block h-4 w-12 bg-(--bg-sunken) rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="flex min-h-28 items-center justify-between gap-4 rounded-lg border border-(--border-default) bg-(--surface-card) p-6">
        <div>
          <p className="bg-body-sm font-semibold text-(--text-primary)">Unable to load form totals</p>
          <p className="mt-1 bg-caption text-(--text-muted)">Please try again.</p>
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
        title="No forms yet"
        description="Create a form to start seeing its analytics here."
        actions={
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
      <div className="hidden sm:block bg-(--surface-card) border border-(--border-default) rounded-xl overflow-x-auto shadow-(--shadow-sm)">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-(--bg-subtle) border-b border-(--border-default) bg-caption font-semibold text-(--text-muted) uppercase tracking-wider">
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
                className="hover:bg-(--surface-hover) cursor-pointer border-b border-(--border-subtle) last:border-0"
              >
                <td className="px-4 py-3 bg-body-sm font-semibold text-(--text-primary) truncate max-w-[280px]">{form.title}</td>
                <td className="px-4 py-3">
                  <StatusBadge variant={form.status}>{STATUS_LABEL[form.status]}</StatusBadge>
                </td>
                <td className="px-4 py-3 bg-body-sm text-(--text-secondary) text-right">{form.totalResponses}</td>
                <td className="hidden md:table-cell px-4 py-3 bg-body-sm text-(--text-secondary) text-right">{changeFor(form)}</td>
                <td className="hidden md:table-cell px-4 py-3 bg-body-sm text-(--text-secondary) text-right">
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
            className="flex flex-col gap-2 rounded-lg border border-(--border-default) bg-(--surface-card) p-4 text-left shadow-(--shadow-sm) hover:bg-(--surface-hover)"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="bg-body-sm font-semibold text-(--text-primary) truncate">{form.title}</span>
              <StatusBadge variant={form.status}>{STATUS_LABEL[form.status]}</StatusBadge>
            </div>
            <span className="bg-caption text-(--text-muted)">
              {form.totalResponses} response{form.totalResponses === 1 ? '' : 's'} · {Math.round(form.completionRate)}% completion · {changeFor(form)}
            </span>
          </button>
        ))}
      </div>

      <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
