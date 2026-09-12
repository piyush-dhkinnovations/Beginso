import React from "react";
import { bx } from "@/lib/utils";

export interface TableColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right";
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
}: TableProps<T>) {
  return (
    <div className="bg-table-wrap">
      <table className={bx("bg-table", "bg-table-stack", stickyFirstColumn && "bg-table-sticky", className)}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={bx(col.align === "right" && "bg-num")}>
                {col.header}
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
              <tr key={rowKey(row)}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    data-label={typeof col.header === "string" ? col.header : undefined}
                    className={bx(col.align === "right" && "bg-num")}
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
