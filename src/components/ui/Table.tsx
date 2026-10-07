import React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { bx } from "@/lib/utils";

export interface TableSort {
  key: string;
  dir: "asc" | "desc";
}

export interface TableColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right";
  /** Extra class on this column's th/td — e.g. collapsing a column to zero width when it has
   * nothing to show right now, rather than just hiding its content and leaving the gap behind. */
  className?: string;
  /** Makes the header a sort button. Matches `TableProps.sort.key` when this column is the active sort. */
  sortKey?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  skeletonRows?: number;
  emptyState?: React.ReactNode;
  className?: string;
  stickyFirstColumn?: boolean;
  onRowDoubleClick?: (row: T) => void;
  /** ~48px rows instead of the default ~63px. */
  dense?: boolean;
  /** Whole row is a click target. Keyboard access must come from a real link/button inside the row
   * (a click that lands on any inner a/button/input is left to that element). */
  onRowClick?: (row: T) => void;
  sort?: TableSort;
  onSortChange?: (key: string) => void;
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §11 TABLE. `emptyState`/loading rows
// accept plain ReactNode rather than importing EmptyState/Skeleton directly (neither exists yet
// this sprint) — a consumer supplies its own, or the real primitives once they land.
//
// `bg-table-stack` + `data-label` (beginso-ui.css §11): below 640px this collapses each row into
// a stacked card instead of horizontally scrolling — the design system's own docs call a
// horizontally-scrolling table on a phone "where mobile UX goes to die". `data-label` is derived
// from `header` only when it's a string (the empty-string action-column header renders no label,
// which is correct — there's nothing to label).
export function Table<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  skeletonRows = 5,
  emptyState,
  className,
  stickyFirstColumn,
  onRowDoubleClick,
  dense,
  onRowClick,
  sort,
  onSortChange,
}: TableProps<T>) {
  return (
    <div className="bg-table-wrap">
      <table className={bx("bg-table", "bg-table-stack", stickyFirstColumn && "bg-table-sticky", dense && "[&_td]:!py-2 [&_th]:!py-2", className)}>
        <thead>
          <tr className="group">
            {columns.map((col) => (
              <th
                key={col.key}
                className={bx(col.align === "right" && "bg-num", col.className)}
                aria-sort={col.sortKey && sort ? (sort.key === col.sortKey ? (sort.dir === "asc" ? "ascending" : "descending") : "none") : undefined}
              >
                {col.sortKey && onSortChange ? (
                  <button
                    type="button"
                    onClick={() => onSortChange(col.sortKey as string)}
                    className="inline-flex items-center gap-1 uppercase tracking-[inherit] hover:text-(--text-primary)"
                  >
                    {col.header}
                    {sort?.key === col.sortKey ? (
                      sort.dir === "asc" ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />
                    ) : (
                      <ChevronsUpDown size={12} className="opacity-50" aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key}>
                    <span className="bg-skeleton bg-skeleton-text" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>{emptyState}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={bx("group", onRowClick && "cursor-pointer")}
                onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row) : undefined}
                onClick={
                  onRowClick
                    ? (e) => {
                        if ((e.target as HTMLElement).closest("a,button,input,label,select,textarea,[role=menuitem]")) return;
                        onRowClick(row);
                      }
                    : undefined
                }
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    data-label={typeof col.header === "string" ? col.header : undefined}
                    className={bx(col.align === "right" && "bg-num", col.className)}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
