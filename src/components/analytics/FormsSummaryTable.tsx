'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart2, FileText, MoreVertical, Plus, Search } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Menu } from '@/components/ui/Menu';
import { Tooltip } from '@/components/ui/Tooltip';
import { ProgressBar } from '@/components/ui/charts';
import { Table, type TableColumn } from '@/components/ui/Table';
import { FormTile } from '@/components/forms/FormTile';
import { PaginationControls } from '@/components/responses/PaginationControls';
import { computeChangePercent, formatChangeLabel } from '@/lib/analyticsChange';
import { cn } from '@/lib/utils';
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
  /** Workspace slug on the Insights page, so drill-ins keep the workspace shell. Omitted = personal. */
  workspaceSlug?: string;
}

// "Form performance": one row per form — tinted icon (colour from its title), status, responses,
// change vs the previous period, completion as a number plus a bar, and a ⋮ menu. The title links
// to that form's own analytics. Search filters the rows already loaded (the summary fetch covers
// up to 100 forms per page).
export function FormsSummaryTable({
  workspaceSlug,
  data,
  previousForms,
  isLoading,
  isError = false,
  onRetry,
  page,
  onPageChange,
}: FormsSummaryTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const forms = useMemo(() => data?.forms ?? [], [data]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? forms.filter((f) => f.title.toLowerCase().includes(term)) : forms;
  }, [forms, search]);

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

  if (forms.length === 0) {
    return (
      <EmptyState
        icon={<FileText />}
        title="No forms yet"
        description="Create a form to start seeing its analytics here."
        actions={
          <Link href={workspaceSlug ? `/w/${workspaceSlug}/forms` : '/forms'}>
            <Button variant="primary">
              <Plus size={16} className="mr-2" />
              Create Form
            </Button>
          </Link>
        }
      />
    );
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const wsQuery = workspaceSlug ? `?ws=${workspaceSlug}` : '';
  const goToForm = (formId: string) => router.push(`/forms/${formId}/analytics${wsQuery}`);

  const previousByFormId = new Map(previousForms?.map((f) => [f._id, f.totalResponses]));
  const changePercent = (form: AnalyticsFormSummary) => {
    const previous = previousByFormId.get(form._id);
    return previous === undefined ? null : computeChangePercent(form.totalResponses, previous);
  };

  const columns: TableColumn<AnalyticsFormSummary>[] = [
    {
      key: 'form',
      header: 'Form',
      render: (form) => (
        <div className="flex min-w-0 items-center gap-3">
          <FormTile title={form.title} />
          <Link href={`/forms/${form._id}/analytics${wsQuery}`} className="bg-body-sm min-w-0 truncate font-semibold text-(--text-primary) hover:underline">
            {form.title}
          </Link>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (form) => <StatusBadge variant={form.status}>{STATUS_LABEL[form.status]}</StatusBadge>,
    },
    {
      key: 'responses',
      header: 'Responses',
      render: (form) => <span className="bg-body-sm tabular-nums text-(--text-primary)">{form.totalResponses}</span>,
    },
    {
      key: 'change',
      header: 'Change',
      render: (form) => {
        const change = changePercent(form);
        return (
          <span
            className={cn(
              'bg-body-sm tabular-nums',
              change === null || change === 0 ? 'text-(--text-muted)' : change > 0 ? 'text-(--success-text)' : 'text-(--error-text)',
            )}
          >
            {formatChangeLabel(change)}
          </span>
        );
      },
    },
    {
      key: 'completion',
      header: 'Completion Rate',
      // Sprint 14 (OQ-3): null = no counted views - "—" with a tooltip, never 0%.
      render: (form) =>
        form.completionRate === null || form.completionRate === undefined ? (
          <Tooltip content="Not enough views yet">
            <span tabIndex={0} className="bg-body-sm text-(--text-muted)">
              {'—'}
              <span className="sr-only">Not enough views yet</span>
            </span>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-3">
            <span className="w-10 bg-body-sm tabular-nums text-(--text-primary)">{Math.round(form.completionRate)}%</span>
            <ProgressBar percent={form.completionRate} width={110} />
          </div>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (form) => (
        <Menu
          trigger={<MoreVertical className="bg-icon" />}
          triggerLabel="More Options"
          align="end"
          items={[{ id: 'analytics', label: 'View analytics', icon: <BarChart2 className="bg-icon" />, onSelect: () => goToForm(form._id) }]}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <h3 className="bg-h5 text-(--text-primary)">Form performance</h3>
          <div className="w-full sm:w-72">
            <Input
              id="forms-performance-search"
              aria-label="Search forms"
              placeholder="Search forms…"
              leftIcon={<Search className="bg-icon" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Table
          columns={columns}
          rows={visible}
          rowKey={(form) => form._id}
          emptyState={<EmptyState illustration="no-results" icon={<Search />} title="No matching forms" description="Try a different search term." />}
        />
      </Card>

      <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
