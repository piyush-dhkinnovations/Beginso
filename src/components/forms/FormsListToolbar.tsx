import { Search } from 'lucide-react';
import { Toolbar } from '@/components/ui/Toolbar';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { type TableSort } from '@/components/ui/Table';
import { FormsViewToggle } from '@/components/forms/FormsViewToggle';
import type { FormsPageState } from '@/hooks/useFormsPage';

export function FormsListToolbar({ s }: { s: FormsPageState }) {
  const { view, setView, search, setSearch, setPage, setSelectedIds, onPinnedTab, sort, setSort } = s;
  return (
    <Toolbar>
      <div className="w-full sm:max-w-sm">
        <Input
          id="forms-search"
          aria-label="Search forms"
          placeholder="Search forms…"
          leftIcon={<Search className="bg-icon" />}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
            setSelectedIds(new Set());
          }}
        />
      </div>
      <div className="ml-auto flex items-center gap-3">
        {view === 'grid' && !onPinnedTab && (
          <div className="w-44">
            <Select
              id="forms-sort"
              aria-label="Sort forms"
              value={`${sort.key}:${sort.dir}`}
              onChange={(event) => {
                const [key, dir] = event.target.value.split(':');
                setSort({ key, dir: dir as TableSort['dir'] });
              }}
            >
              <option value="updated:desc">Latest updated</option>
              <option value="updated:asc">Oldest updated</option>
              <option value="title:asc">Name (A–Z)</option>
              <option value="responses:desc">Most responses</option>
            </Select>
          </div>
        )}
        <FormsViewToggle value={view} onChange={setView} />
      </div>
    </Toolbar>
  );
}
