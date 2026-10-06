'use client';

import { useRouter } from 'next/navigation';
import { Eye, FileText, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Table, type TableColumn } from '@/components/ui/Table';
import { StageBadge } from './StageBadge';
import { RespondentCell, TagsCell, AssigneeCell, SubmittedCell } from './ResponseRow';
import { detectRespondentIdentity, shortId } from '@/lib/formatters';
import type { IResponse } from '@/types/response';

interface ResponsesTableProps {
  responses: IResponse[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectRow: (id: string, checked: boolean) => void;
  onViewResponse: (id: string) => void;
  onDeleteResponse: (id: string) => void;
  /** True when any filter (search, stage, tag, assignee, unread, ...) is active — swaps the empty
   * state to the "no matches" variant (requirements.md §12: a distinct screen, never the
   * zero-items copy). */
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  /** Undefined on the all-forms view — the empty-state CTA falls back to "Go to Forms". */
  formId?: string;
}

export function ResponsesTable({
  responses,
  isLoading,
  selectedIds,
  onSelectAll,
  onSelectRow,
  onViewResponse,
  onDeleteResponse,
  hasActiveFilters = false,
  onClearFilters,
  formId,
}: ResponsesTableProps) {
  const router = useRouter();
  const allSelected = responses.length > 0 && selectedIds.size === responses.length;

  const emptyState = hasActiveFilters ? (
    <EmptyState illustration="no-results"
      icon={<FileText />}
      title="No responses match these filters"
      description="Try a different search term or clear a filter."
      actions={
        onClearFilters && (
          <Button variant="secondary" onClick={onClearFilters}>Clear filters</Button>
        )
      }
    />
  ) : (
    <EmptyState illustration="empty-inbox"
      icon={<FileText />}
      title="No responses yet"
      description="Once someone submits your published form, their answers land here. Share the link to get started."
      actions={
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

  const columns: TableColumn<IResponse>[] = [
    // Collapsed to zero width (not just hidden) until something is selected — double-clicking any
    // row is what first reveals the whole column (see onRowDoubleClick below), not hover. Column
    // itself, not just its content, disappears so the Respondent column doesn't sit with a gap
    // in front of it at rest.
    {
      key: 'select',
      className: selectedIds.size > 0 ? undefined : 'w-0 !p-0 overflow-hidden',
      header: selectedIds.size > 0 ? (
        <Checkbox
          id="responses-select-all"
          checked={allSelected}
          onChange={(e) => onSelectAll(e.target.checked)}
          aria-label="Select all responses on this page"
        />
      ) : null,
      render: (r) => selectedIds.size > 0 ? (
        <Checkbox
          id={`response-select-${r._id}`}
          checked={selectedIds.has(r._id)}
          onChange={(e) => onSelectRow(r._id, e.target.checked)}
          aria-label={`Select response from ${detectRespondentIdentity(r.answers).label ?? detectRespondentIdentity(r.answers).email ?? shortId(r._id)}`}
        />
      ) : null,
    },
    { key: 'respondent', header: 'Respondent', render: (r) => <RespondentCell response={r} /> },
    { key: 'email', header: 'Email', render: (r) => detectRespondentIdentity(r.answers).email ?? '—' },
    { key: 'tags', header: 'Tags', render: (r) => <TagsCell tags={r.tags} /> },
    { key: 'assignee', header: 'Assignee', render: (r) => <AssigneeCell response={r} /> },
    { key: 'stage', header: 'Stage', render: (r) => <StageBadge stage={r.stage} status={r.status} /> },
    { key: 'submitted', header: 'Submitted', render: (r) => <SubmittedCell response={r} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="small"
            aria-label={`Open response from ${detectRespondentIdentity(r.answers).label ?? detectRespondentIdentity(r.answers).email ?? 'this respondent'}`}
            onClick={() => onViewResponse(r._id)}
            className="w-11 h-11 p-0"
          >
            <Eye size={16} />
          </Button>
          <Button
            variant="ghost"
            size="small"
            aria-label="Delete response"
            onClick={() => onDeleteResponse(r._id)}
            className="w-11 h-11 p-0 text-(--error-text) hover:text-(--error-text)"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      rows={responses}
      rowKey={(r) => r._id}
      isLoading={isLoading}
      skeletonRows={5}
      emptyState={emptyState}
      stickyFirstColumn
      className="bg-table-compact"
      onRowDoubleClick={(r) => onSelectRow(r._id, true)}
    />
  );
}
