import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { bx } from "@/lib/utils";

export interface PaginationProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// beginso-ui.css §12 NAVIGATION ("Pagination"). Prop shape mirrors the existing
// src/components/responses/PaginationControls.tsx so list pages can adopt this without
// a data-shape change (requirements.md 2.3).
function pageRange(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("ellipsis");
    out.push(p);
  });
  return out;
}

export function Pagination({ page, totalPages, onPageChange, className, ...props }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className={bx("bg-pagination", className)} {...props}>
      <button
        type="button"
        className="bg-page-btn"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="bg-icon" aria-hidden="true" />
      </button>
      {pageRange(page, totalPages).map((p, i) =>
        p === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className="bg-page-btn" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className="bg-page-btn"
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        className="bg-page-btn"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="bg-icon" aria-hidden="true" />
      </button>
    </nav>
  );
}
