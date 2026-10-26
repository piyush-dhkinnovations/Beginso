import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { FormCard } from '@/components/forms/FormCard';
import { FormsEmptyFiltered } from '@/components/forms/FormsEmptyState';
import { renderPinButton, renderRowMenu } from '@/components/forms/FormRowMenu';
import { buildFormColumns } from '@/components/forms/formsTableColumns';
import { formHref } from '@/components/forms/formsListUtils';
import type { FormsPageState } from '@/hooks/useFormsPage';
import type { FormsContext } from '@/types/workspace';

// Error alert, list table or card grid, depending on the view and load state.
export function FormsResults({ s, context }: { s: FormsPageState; context: FormsContext }) {
  const { error, refetch, view, rows, isLoading, onPinnedTab, sort, toggleSort, openOrSelect, canDelete, openTimer, toggleSelected, maxResponses } = s;
  const emptyFiltered = <FormsEmptyFiltered s={s} />;

  if (error) {
    return (
      <Alert variant="error" title="Failed to load forms.">
        <Button variant="secondary" size="small" className="mt-2" onClick={() => refetch()}>Retry</Button>
      </Alert>
    );
  }
  if (view === 'list') {
    return (
      <Table
        columns={buildFormColumns(s, context)}
        rows={rows}
        rowKey={(form) => form._id}
        isLoading={isLoading}
        dense
        sort={onPinnedTab ? undefined : sort}
        onSortChange={onPinnedTab ? undefined : toggleSort}
        onRowClick={openOrSelect}
        onRowDoubleClick={canDelete ? (form) => {
          if (openTimer.current) clearTimeout(openTimer.current);
          toggleSelected(form._id);
        } : undefined}
        emptyState={emptyFiltered}
      />
    );
  }
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 min-[90rem]:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-lg border border-(--border-default) bg-(--bg-sunken)" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) return emptyFiltered;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 min-[90rem]:grid-cols-4">
      {rows.map((form) => (
        <FormCard
          key={form._id}
          form={form}
          href={formHref(`/forms/${form._id}/overview`, context)}
          menu={<>{renderPinButton(form, s)}{renderRowMenu(form, s, context)}</>}
          maxResponses={maxResponses}
        />
      ))}
    </div>
  );
}
