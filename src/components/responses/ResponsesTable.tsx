'use client';

import { useRouter } from 'next/navigation';
import { Eye, FileText, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Table, type TableColumn } from '@/components/ui/Table';
import { StageBadge } from './StageBadge';
import { RespondentCell, TagsCell, AssigneeCell, SubmittedCell } from './ResponseRow';
import { detectRespondentIdentity } from '@/lib/formatters';
import { useFormFieldsMap } from '@/hooks/useFormFields';
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
  const fieldsByForm = useFormFieldsMap(responses.map((r) => r.formId));
  const rows = useMemo(() => {
    if (!sort) return responses;
    const sign = sort.dir === 'asc' ? 1 : -1;
    const value = (r: IResponse): string => {
      if (sort.key === 'respondent') {
        const id = detectRespondentIdentity(r.answers, fieldsByForm[r.formId]);
        return (id.label ?? id.email ?? '').toLowerCase();
      }
      if (sort.key === 'stage') return (r.stage?.name ?? r.status ?? '').toLowerCase();
      return r.submittedAt ?? '';
    };
    return [...responses].sort((a, b) => sign * value(a).localeCompare(value(b)));
  }, [responses, sort, fieldsByForm]);
  const respondentLabel = (r: IResponse) => {
    const id = detectRespondentIdentity(r.answers, fieldsByForm[r.formId]);
    return id.label ?? id.email ?? 'this respondent';
  };

  const emptyState = hasActiveFilters ? (
    <EmptyState
      icon={<FileText />}
      heading="No responses match these filters"
      body="Try a different search term or clear a filter."
      action={
        onClearFilters && (
          <Button variant="secondary" onClick={onClearFilters}>Clear filters</Button>
        )
      }
    />
  ) : (
    <EmptyState
      icon={<FileText />}
      heading="No responses yet"
      body="Once someone submits your published form, their answers land here. Share the link to get started."
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

  const columns: TableColumn<IResponse>[] = [
    {
      key: 'select',
      header: (
        <Checkbox
          id="responses-select-all"
          checked={allSelected}
          onChange={(e) => onSelectAll(e.target.checked)}
          aria-label="Select all responses on this page"
        />
      ),
      render: (r) => (
        <Checkbox
          id={`response-select-${r._id}`}
          checked={selectedIds.has(r._id)}
          onChange={(e) => onSelectRow(r._id, e.target.checked)}
          aria-label={`Select response from ${detectRespondentIdentity(r.answers).label ?? detectRespondentIdentity(r.answers).email ?? shortId(r._id)}`}
        />
      ),
    },
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
    { key: 'email', header: 'Email', render: (r) => detectRespondentIdentity(r.answers, fieldsByForm[r.formId]).email ?? '—' },
    { key: 'tags', header: 'Tags', render: (r) => <TagsCell tags={r.tags} /> },
    { key: 'assignee', header: 'Assignee', render: (r) => <AssigneeCell response={r} /> },
    { key: 'stage', header: 'Stage', render: (r) => <StageBadge stage={r.stage} /> },
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
            className="w-11 h-11 p-0 text-error hover:text-error"
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
    />
  );
}
