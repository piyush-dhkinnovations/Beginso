'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, FileText, CheckSquare, MoreVertical, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Table, type TableColumn, type TableSort } from '@/components/ui/Table';
import { Menu } from '@/components/ui/Menu';
import { RespondentCell, RowLead } from './ResponseRow';
import { StageMenu } from './StageMenu';
import { ResponseColumnCell, columnLabel } from './ResponseColumnCell';
import { detectRespondentIdentity } from '@/lib/formatters';
import { DEFAULT_RESPONSE_SETUP, DEFAULT_TABLE_COLUMNS, questionOfColumn, type ResponseSetupValues } from '@/types/responseSetup';
import { answerFor, textFields } from '@/lib/answerText';
import { useFormFieldsMap } from '@/hooks/useFormFields';
import type { IResponse } from '@/types/response';
import type { StageRef } from '@/types/stage';

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
  /** How many responses match the filters across ALL pages. Respondent and Stage can only be sorted when every match is on screen. */
  totalMatching?: number;
  /** Submission order, applied by the server across every page (newest first by default). */
  submittedOrder?: 'asc' | 'desc';
  onSubmittedOrderChange?: (order: 'asc' | 'desc') => void;
  /** The column the server sorts every page by: `submitted` (default), `email`, or `q:<fieldId>`. `submittedOrder` is its direction. */
  sortBy?: string;
  onSortChange?: (key: string, dir: 'asc' | 'desc') => void;
  /** The form's columns and look (Customize). Absent on the all-forms view, which always shows the standard columns. */
  setup?: ResponseSetupValues;
  /** With `onChangeStage`, the stage badge becomes a menu of these stages (one form's responses only: stages differ between forms). */
  stages?: readonly StageRef[];
  onChangeStage?: (responseId: string, stageId: string) => void;
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
  totalMatching,
  submittedOrder = 'desc',
  onSubmittedOrderChange,
  sortBy = 'submitted',
  onSortChange,
  setup,
  stages,
  onChangeStage,
}: ResponsesTableProps) {
  const stageMenu = !!formId && !formNames && !!stages && stages.length > 0 && !!onChangeStage;
  const { tableColumns, rowHeight, wrap, respondentFrom } = formNames || !setup ? DEFAULT_RESPONSE_SETUP : setup;
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

  // Submitted is sorted by the SERVER, across every page (QA D8-006: sorting only the 50 loaded rows gave a wrong order whenever a form
  // had more than a page). Respondent and Stage have no server sort (the respondent's name is worked out from the answers in the
  // browser), so they are offered only when every matching response is already on screen; otherwise the column is not sortable.
  const everythingLoaded = totalMatching === undefined || totalMatching <= responses.length;
  const [pageSort, setPageSort] = useState<TableSort | undefined>();
  const activePageSort = everythingLoaded ? pageSort : undefined;
  const sort: TableSort | undefined = activePageSort ?? { key: sortBy, dir: submittedOrder };
  // Sorted by the server across every page: the submission time, the email, and one form's questions (answers are filed per form).
  const serverSortable = (key: string) => key === 'submitted' || key === 'email' || (!!formId && key.startsWith('q:'));
  const toggleSort = (key: string) => {
    if (serverSortable(key)) {
      setPageSort(undefined);
      // Another column starts A to Z (newest first for the time); the same column turns round.
      const dir = key === sortBy ? (submittedOrder === 'desc' ? 'asc' : 'desc') : key === 'submitted' ? 'desc' : 'asc';
      if (onSortChange) onSortChange(key, dir);
      else if (key === 'submitted') onSubmittedOrderChange?.(dir);
      return;
    }
    setPageSort((cur) => (cur?.key === key ? (cur.dir === 'asc' ? { key, dir: 'desc' } : undefined) : { key, dir: 'asc' }));
  };
  const fieldsByForm = useFormFieldsMap(responses.map((r) => r.formId));
  const fields = formId ? fieldsByForm[formId] : undefined;
  // The first column that is drawn (a column for a deleted question is skipped) carries the person's picture, whatever it shows.
  const firstColumn = tableColumns.find((k) => columnLabel(k, fields) !== undefined);
  const rows = useMemo(() => {
    if (!activePageSort) return responses;
    const sign = activePageSort.dir === 'asc' ? 1 : -1;
    const key = activePageSort.key;
    const identity = (r: IResponse) => detectRespondentIdentity(r.answers, fieldsByForm[r.formId], r.respondentEmail, respondentFrom);
    const questionId = questionOfColumn(key);
    const question = questionId ? textFields(fieldsByForm[formId ?? '']).find((f) => f.fieldId === questionId) : undefined;
    // A column of numbers sorts as numbers (9 before 10), anything else as text; a blank answer goes last either way.
    const value = (r: IResponse): string | number | undefined => {
      if (question) return answerFor(r.answers, fieldsByForm[r.formId], question)?.toLowerCase();
      switch (key) {
        case 'respondent': return (identity(r).label ?? identity(r).email ?? '').toLowerCase() || undefined;
        case 'email': return identity(r).email?.toLowerCase();
        case 'stage': return (r.stage?.name ?? r.status ?? '').toLowerCase() || undefined;
        case 'assignee': return r.assignee?.name.toLowerCase();
        case 'tags': return r.tags?.[0]?.name.toLowerCase();
        case 'score': return typeof r.scoreAverage === 'number' ? r.scoreAverage : undefined;
        case 'notes': return r.noteCount ?? 0;
        default: return r.submittedAt ?? '';
      }
    };
    const compare = (a: string | number, b: string | number) =>
      typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), undefined, { numeric: true });
    return [...responses].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      if (va === undefined || vb === undefined) return va === vb ? 0 : va === undefined ? 1 : -1;
      return sign * compare(va, vb);
    });
  }, [responses, activePageSort, fieldsByForm, respondentFrom, formId]);
  const respondentLabel = (r: IResponse) => {
    const id = detectRespondentIdentity(r.answers, fieldsByForm[r.formId], r.respondentEmail, respondentFrom);
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
    ...tableColumns.flatMap((key): TableColumn<IResponse>[] => {
      const header = columnLabel(key, fields);
      if (header === undefined) return []; // a question that has since been deleted
      // The first column that is drawn carries the picture and the unread dot, whatever it shows.
      const lead = key === firstColumn;
      // Every column has the sort arrows like Submitted. Submitted is sorted by the server; the rest only while every match is on screen.
      const sortable = serverSortable(key) || everythingLoaded;
      const column: TableColumn<IResponse> = {
        key,
        header,
        sortKey: sortable ? key : undefined,
        render: (r) => {
          if (key === 'stage' && stageMenu) {
            const menu = <StageMenu response={r} stages={stages} onChange={onChangeStage} />;
            return lead ? <RowLead response={r}>{menu}</RowLead> : menu;
          }
          if (key !== 'respondent') return <ResponseColumnCell columnKey={key} response={r} fields={fieldsByForm[r.formId]} respondentFrom={respondentFrom} wrap={wrap} lead={lead} />;
          // The real button gives the row its keyboard/screen-reader semantics; a click anywhere else on the row also opens it.
          const open = (
            <button type="button" onClick={() => openOrSelect(r)} aria-label={`Open response from ${respondentLabel(r)}`} className="block min-w-0 text-left">
              <RespondentCell response={r} withAvatar={false} />
            </button>
          );
          return lead ? <RowLead response={r}>{open}</RowLead> : open;
        },
      };
      // The standard table puts the form's name right after the respondent on the all-forms view.
      return key === 'respondent' && formNames
        ? [
            column,
            {
              key: 'form',
              header: 'Form',
              render: (r: IResponse) => <span className="block max-w-48 truncate" title={formNames[r.formId]}>{formNames[r.formId] ?? '—'}</span>,
            },
          ]
        : [column];
    }),
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
      compact={rowHeight === 'compact'}
      // More columns than the page is wide: the table scrolls sideways inside its frame and the first column stays put.
      className={tableColumns.length > DEFAULT_TABLE_COLUMNS.length || tableColumns.some((k) => k.startsWith('q:')) ? 'w-max min-w-full' : undefined}
      sort={sort}
      onSortChange={toggleSort}
      onRowClick={openOrSelect}
      onRowDoubleClick={startSelecting}
    />
  );
}
