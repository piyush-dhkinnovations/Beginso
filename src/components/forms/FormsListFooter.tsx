import { ListFooter } from '@/components/ui/ListFooter';
import { Select } from '@/components/ui/Select';
import { PAGE_SIZES } from '@/components/forms/formsListUtils';
import type { FormsPageState } from '@/hooks/useFormsPage';

export function FormsListFooter({ s, total }: { s: FormsPageState; total: number }) {
  const { page, setPage, pageSize, setPageSize, setSelectedIds } = s;
  return (
    <ListFooter
      page={page}
      pageSize={pageSize}
      total={total}
      noun="form"
      onPageChange={(p) => {
        setPage(p);
        setSelectedIds(new Set());
      }}
    >
      <div className="flex items-center gap-2">
        <label htmlFor="forms-page-size" className="bg-body-sm text-(--text-muted)">Rows per page</label>
        <div className="w-20">
          <Select
            id="forms-page-size"
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]);
              setPage(1);
              setSelectedIds(new Set());
            }}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </Select>
        </div>
      </div>
    </ListFooter>
  );
}
