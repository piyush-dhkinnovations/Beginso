import React from "react";
import { Pagination } from "./Pagination";

export interface ListFooterProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Singular noun for the summary; default "result". */
  noun?: string;
  /** Extra controls on the right, e.g. a rows-per-page select. */
  children?: React.ReactNode;
}

// `Showing 1–20 of 77` + page buttons. Renders nothing over an empty result; the page buttons
// are hidden at one page (Pagination returns null at totalPages <= 1).
export function ListFooter({ page, pageSize, total, onPageChange, noun = "result", children }: ListFooterProps) {
  if (total <= 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="bg-caption text-(--text-muted)">
        Showing {start}–{end} of {total} {noun}
        {total === 1 ? "" : "s"}
      </span>
      <div className="flex flex-wrap items-center gap-4">
        {children}
        <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPageChange={onPageChange} />
      </div>
    </div>
  );
}
