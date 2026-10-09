'use client';

import { LayoutTemplate, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui';
import { BulkActionBar } from '@/components/forms/BulkActionBar';
import { FormsManagerTabs } from '@/components/forms/FormsManagerTabs';
import { FormsDialogs } from '@/components/forms/FormsDialogs';
import { FormsFirstRunEmpty } from '@/components/forms/FormsEmptyState';
import { FormsListFooter } from '@/components/forms/FormsListFooter';
import { FormsListToolbar } from '@/components/forms/FormsListToolbar';
import { FormsResults } from '@/components/forms/FormsResults';
import { useFormsPage } from '@/hooks/useFormsPage';
import type { FormsContext } from '@/types/workspace';

export interface FormsPageProps {
  context?: FormsContext;
}

export default function FormsPage({ context = { type: 'personal' } }: FormsPageProps) {
  const s = useFormsPage(context);
  const { data, isLoading, error } = s;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <PageHeader
        title="Forms"
        description={s.headerFacts}
        actionsAlign="center"
        actions={
          <>
            <ButtonLink href="/templates" variant="secondary">
              <LayoutTemplate size={16} className="mr-2" aria-hidden="true" />
              Templates
            </ButtonLink>
            {s.canCreate && (
              <Button
                variant="primary"
                onClick={() => s.setIsModalOpen(true)}
                aria-label="Create new form"
              >
                <Plus size={16} className="mr-2" />
                Create Form
              </Button>
            )}
          </>
        }
      />

      {s.isFirstRun ? (
        <FormsFirstRunEmpty s={s} />
      ) : (
        <>
          <FormsManagerTabs activeTab={s.activeTab} onChange={s.handleTabChange} counts={s.tabCounts} />

          <FormsListToolbar s={s} />

          {s.canDelete && s.view === 'list' && (
            <BulkActionBar
              count={s.selectedIds.size}
              isDeleting={s.bulkDeleteMutation.isPending}
              onDeleteSelected={() => s.setBulkDeleteConfirming(true)}
              onArchiveSelected={
                s.canArchive
                  ? () => s.archiveMutation.mutate({ ids: [...s.selectedIds], archive: !s.onArchivedTab })
                  : undefined
              }
              isArchiving={s.archiveMutation.isPending}
              archiveLabel={s.onArchivedTab ? 'Unarchive' : 'Archive'}
            />
          )}

          <FormsResults s={s} context={context} />

          {!isLoading && !error && data && <FormsListFooter s={s} total={data.total} />}
        </>
      )}

      <FormsDialogs s={s} context={context} />
    </div>
  );
}
