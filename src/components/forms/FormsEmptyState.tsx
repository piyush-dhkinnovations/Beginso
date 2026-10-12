import { Plus, FileText, Pin, Archive, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { STATUS_LABEL } from '@/components/forms/formsListUtils';
import type { FormsPageState } from '@/hooks/useFormsPage';

export function CreateFormButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="primary" onClick={onClick}>
      <Plus size={16} className="mr-2" />
      Create Form
    </Button>
  );
}

// First run: nothing exists yet and nothing is filtered.
export function FormsFirstRunEmpty({ s }: { s: FormsPageState }) {
  return (
    <EmptyState
      illustration="empty-forms"
      icon={<FileText />}
      title="No forms yet"
      description="Create your first form to get started collecting responses."
      actions={s.canCreate ? <CreateFormButton onClick={() => s.startCreate()} /> : undefined}
    />
  );
}

// Zero archived forms vs no matches are different screens (wireframe state rule). Archived forms are never
// "first run": the empty copy explains what Archive is for and points back to the active list.
export function FormsEmptyFiltered({ s }: { s: FormsPageState }) {
  const { search, status, allCount, onArchivedTab, onPinnedTab, canCreate, handleTabChange } = s;

  if (onPinnedTab) {
    return search ? (
      <EmptyState illustration="no-results" icon={<Search />} title="No matching pinned forms" description="Try changing your search." />
    ) : (
      <EmptyState
        illustration="empty-forms"
        icon={<Pin />}
        title="No pinned forms yet"
        description="Pin the forms you open most so they are always one click away."
        primaryAction={
          <Button variant="primary" onClick={() => handleTabChange('recent')}>
            Go to Recent
          </Button>
        }
      />
    );
  }

  if (onArchivedTab && !search) {
    return (
      <EmptyState
        icon={<Archive />}
        title="No archived forms"
        description="Archive a finished form to keep it and its responses without cluttering your list."
        primaryAction={
          <Button variant="primary" onClick={() => handleTabChange('recent')}>
            Go to Forms
          </Button>
        }
        secondaryAction={
          canCreate ? (
            <Button variant="secondary" onClick={() => s.startCreate()}>
              <Plus size={16} className="mr-2" />
              Create Form
            </Button>
          ) : undefined
        }
      />
    );
  }

  // A filtered-empty state names the filter and the size of what is hidden, and offers to clear it.
  const filterName = search ? `"${search}"` : status !== 'all' ? STATUS_LABEL[status].toLowerCase() : '';
  const clearFilters = () => {
    s.setSearch('');
    handleTabChange('recent');
  };
  const hiddenElsewhere = allCount && allCount > 0 ? allCount : 0;
  return filterName ? (
    <EmptyState
      illustration="no-results"
      icon={<FileText />}
      title={search ? `No forms match ${filterName}` : `No ${filterName} forms`}
      description={hiddenElsewhere ? `There ${hiddenElsewhere === 1 ? 'is 1 other form' : `are ${hiddenElsewhere} other forms`}.` : undefined}
      actions={<Button variant="secondary" onClick={clearFilters}>Clear filter</Button>}
    />
  ) : (
    <EmptyState
      illustration="empty-forms"
      icon={<FileText />}
      title="No forms yet"
      description="Create your first form to get started collecting responses."
      actions={canCreate ? <CreateFormButton onClick={() => s.startCreate()} /> : undefined}
    />
  );
}
