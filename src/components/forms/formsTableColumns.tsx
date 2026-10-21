import Link from 'next/link';
import { Pin } from 'lucide-react';
import { formatRelativeTime } from '@/lib/formatters';
import { OwnerMonogram } from '@/components/forms/OwnerMonogram';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { type TableColumn } from '@/components/ui/Table';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormTile } from '@/components/forms/FormTile';
import { renderRowMenu } from '@/components/forms/FormRowMenu';
import { STATUS_LABEL, STATUS_VARIANT, formHref, formatUpdated } from '@/components/forms/formsListUtils';
import type { FormsPageState } from '@/hooks/useFormsPage';
import type { Form } from '@/types/form';
import type { FormsContext } from '@/types/workspace';

export function buildFormColumns(s: FormsPageState, context: FormsContext): TableColumn<Form>[] {
  const { canDelete, selecting, allOnPageSelected, someOnPageSelected, rows, selectedIds, setSelectedIds, ownerName, openOrSelect } = s;
  return [
    ...(canDelete && selecting ? [{
      key: 'select',
      className: 'w-10',
      header: (
        <Checkbox
          id="forms-select-all"
          aria-label={allOnPageSelected ? 'Deselect all forms on this page' : 'Select all forms on this page'}
          checked={allOnPageSelected}
          ref={(el) => {
            if (el) el.indeterminate = someOnPageSelected;
          }}
          onChange={(e) => {
            const checked = e.target.checked;
            setSelectedIds((prev) => {
              const next = new Set(prev);
              rows.forEach((form) => (checked ? next.add(form._id) : next.delete(form._id)));
              return next;
            });
          }}
        />
      ),
      render: (form: Form) => (
        <Checkbox
          id={`forms-select-${form._id}`}
          aria-label={`Select ${form.title}`}
          checked={selectedIds.has(form._id)}
          onChange={(e) => {
            const checked = e.target.checked;
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (checked) next.add(form._id);
              else next.delete(form._id);
              return next;
            });
          }}
        />
      ),
    }] : []),
    {
      key: 'form',
      header: 'Form Title',
      sortKey: 'title',
      // Takes whatever width the other columns leave and truncates the title (max-w-0 lets the cell shrink below its text).
      className: 'w-full max-w-0',
      render: (form) => {
        const owner = ownerName(form);
        return (
          <div className="flex min-w-0 items-center gap-3">
            <FormTile title={form.title} size={40} logoUrl={form.branding?.logoUrl} iconName={form.branding?.iconName} />
            <div className="flex min-w-0 flex-col">
              <span className="flex min-w-0 items-center gap-1.5">
                <Link
                  href={formHref(`/forms/${form._id}/overview`, context)}
                  className="bg-body-sm font-semibold truncate text-(--text-primary) hover:underline"
                  onClick={canDelete ? (e) => {
                    // Plain clicks go through the same open-or-select path as the row, so a double-click on the title can start selection.
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    openOrSelect(form);
                  } : undefined}
                >
                  {form.title}
                </Link>
                {form.pinned && (
                  <>
                    <Pin size={12} className="flex-none fill-current text-(--action-primary)" aria-hidden="true" />
                    <span className="sr-only">Pinned</span>
                  </>
                )}
              </span>
              <span className="bg-caption truncate text-(--text-muted)">
                {owner ? `${owner} · ` : ''}created {formatRelativeTime(form.createdAt)}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'owner',
      header: 'Owner',
      // Just an avatar: hidden below 1024px so the table fits beside the sidebar rail instead of clipping its last column (QA A12-003).
      className: 'max-lg:hidden',
      render: (form) => <OwnerMonogram name={ownerName(form)} brandColor={form.branding?.primaryColor} title={form.title} />,
    },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'status',
      render: (form) => <StatusBadge variant={STATUS_VARIANT[form.status]}>{STATUS_LABEL[form.status]}</StatusBadge>,
    },
    {
      key: 'responses',
      header: 'Responses',
      sortKey: 'responses',
      render: (form) => <span className="bg-body-sm tabular-nums text-(--text-primary)">{form.responseCount}</span>,
    },
    {
      key: 'updated',
      header: 'Updated',
      sortKey: 'updated',
      render: (form) => <span className="bg-body-sm text-(--text-secondary)">{formatUpdated(form.updatedAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (form) => renderRowMenu(form, s, context),
    },
  ];
}
