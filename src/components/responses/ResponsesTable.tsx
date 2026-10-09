'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, FileText, CheckSquare, MoreVertical, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Table, type TableColumn, type TableSort } from '@/components/ui/Table';
import { Menu } from '@/components/ui/Menu';
import { StageBadge } from './StageBadge';
import { RespondentCell, TagsCell, AssigneeCell, SubmittedCell } from './ResponseRow';
import { detectRespondentIdentity } from '@/lib/formatters';
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
  /** Names the active filters for the no-results state, e.g. `Stage: New · Search "maya"`. */
  filterSummary?: string;
  /** Responses that exist but are hidden by the filters (total minus matches), when known. */
  otherCount?: number;
  /** Undefined on the all-forms view — the empty-state CTA falls back to "Go to Forms". */
  formId?: string;
  /** form id → title. Present only on the all-forms view, where it adds a Form column. */
  formNames?: Record<string, string>;
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
  filterSummary,
  otherCount,
  formId,
  formNames,
}: ResponsesTableProps) {
  const router = useRouter();
  const allSelected = responses.length > 0 && selectedIds.size === responses.length;
  // Checkboxes stay hidden until the user asks for them (double-click a row, or "Select" in the row menu) and
  // go away again when the last row is deselected.
  const selecting = selectedIds.size > 0;
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A single click opens the response; hold it briefly so a double-click can cancel it and select instead.
  const openOrSelect = (r: IResponse) => {
    if (selecting) {
      onSelectRow(r._id, !selectedIds.has(r._id));
      return;
    }
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => onViewResponse(r._id), 220);
  };
  const startSelecting = (r: IResponse) => {
    if (openTimer.current) clearTimeout(openTimer.current);
    onSelectRow(r._id, !selectedIds.has(r._id));
  };

  // ponytail: GET /api/responses has no sort parameter (always submittedAt desc), so this sorts only the
  // loaded page (50 rows). Add a server-side `sort` param if inboxes routinely span pages.
  const [sort, setSort] = useState<TableSort | undefined>();
  const toggleSort = (key: string) =>
    setSort((cur) => (cur?.key === key ? (cur.dir === 'asc' ? { key, dir: 'desc' } : undefined) : { key, dir: key === 'submitted' ? 'desc' : 'asc' }));
  const rows = useMemo(() => {
    if (!sort) return responses;
    const sign = sort.dir === 'asc' ? 1 : -1;
    const value = (r: IResponse): string => {
      if (sort.key === 'respondent') {
        const id = detectRespondentIdentity(r.answers);
        return (id.label ?? id.email ?? '').toLowerCase();
      }
      if (sort.key === 'stage') return (r.stage?.name ?? r.status ?? '').toLowerCase();
      return r.submittedAt ?? '';
    };
    return [...responses].sort((a, b) => sign * value(a).localeCompare(value(b)));
  }, [responses, sort]);
  const respondentLabel = (r: IResponse) => {
    const id = detectRespondentIdentity(r.answers);
    return id.label ?? id.email ?? 'this respondent';
  };

  const emptyState = hasActiveFilters ? (
    <EmptyState illustration="no-results"
      icon={<FileText />}
      title={filterSummary ? `No responses match ${filterSummary}` : 'No responses match these filters'}
      description={otherCount ? `There ${otherCount === 1 ? 'is 1 other response' : `are ${otherCount} other responses`}.` : undefined}
      actions={
        onClearFilters && (
          <Button variant="secondary" onClick={onClearFilters}>Clear filter</Button>
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
    ...(selecting ? [{
      key: 'select',
      className: 'w-10',
      header: (
        <Checkbox
          id="responses-select-all"
          checked={allSelected}
          onChange={(e) => onSelectAll(e.target.checked)}
          aria-label="Select all responses on this page"
        />
      ),
      render: (r: IResponse) => (
        <Checkbox
          id={`response-select-${r._id}`}
          checked={selectedIds.has(r._id)}
          onChange={(e) => onSelectRow(r._id, e.target.checked)}
          aria-label={`Select response from ${respondentLabel(r)}`}
        />
      ),
    }] : []),
    {
      key: 'respondent',
      header: 'Respondent',
      sortKey: 'respondent',
      // The real button gives the row its keyboard/screen-reader semantics; a click anywhere else on the row also opens it.
      render: (r) => (
        <button type="button" onClick={() => openOrSelect(r)} aria-label={`Open response from ${respondentLabel(r)}`} className="block min-w-0 text-left">
          <RespondentCell response={r} />
        </button>
      ),
    },
    ...(formNames ? [{
      key: 'form',
      header: 'Form',
      render: (r: IResponse) => <span className="block max-w-48 truncate" title={formNames[r.formId]}>{formNames[r.formId] ?? '—'}</span>,
    }] : []),
    { key: 'email', header: 'Email', render: (r) => detectRespondentIdentity(r.answers).email ?? '—' },
    { key: 'tags', header: 'Tags', render: (r) => <TagsCell tags={r.tags} /> },
    { key: 'assignee', header: 'Assignee', render: (r) => <AssigneeCell response={r} /> },
    { key: 'stage', header: 'Stage', sortKey: 'stage', render: (r) => <StageBadge stage={r.stage} status={r.status} /> },
    { key: 'submitted', header: 'Submitted', sortKey: 'submitted', render: (r) => <SubmittedCell response={r} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <Menu
          trigger={<MoreVertical className="bg-icon" />}
          triggerLabel={`Actions for response from ${respondentLabel(r)}`}
          align="end"
          items={[
            ...(selecting ? [] : [{ id: 'select', label: 'Select', icon: <CheckSquare className="bg-icon" />, onSelect: () => startSelecting(r) }]),
            { id: 'open', label: 'Open response', icon: <ExternalLink className="bg-icon" />, onSelect: () => onViewResponse(r._id) },
            { id: 'delete', label: 'Delete response', icon: <Trash2 className="bg-icon" />, danger: true, onSelect: () => onDeleteResponse(r._id) },
          ]}
        />
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      rows={rows}
      rowKey={(r) => r._id}
      isLoading={isLoading}
      skeletonRows={5}
      emptyState={emptyState}
      stickyFirstColumn
      dense
      sort={sort}
      onSortChange={toggleSort}
      onRowClick={openOrSelect}
      onRowDoubleClick={startSelecting}
    />
  );
}
