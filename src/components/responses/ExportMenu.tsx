'use client';

import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Menu } from '@/components/ui/Menu';
import type { ReportFormat } from '@/types/report';

interface ExportMenuProps {
  /** How many responses are chosen in the list; 0 = nothing chosen, so the export is every response the filters match. */
  selectedCount: number;
  /** "Select all N matching" is on: the export is that filter, not a list of ids. */
  allMatching?: boolean;
  onExport: (format: ReportFormat) => void;
}

/**
 * The Responses page's Export. With responses chosen in the list it exports exactly those (a PDF of each one's questions and answers);
 * with none chosen it exports what the page is showing.
 */
export function ExportMenu({ selectedCount, allMatching, onExport }: ExportMenuProps) {
  const chosen = selectedCount > 0;
  const what = !chosen ? 'All responses' : allMatching ? `All ${selectedCount} matching` : `${selectedCount} selected`;
  const pdfName = chosen && !allMatching ? 'PDF' : 'PDF report';
  return (
    <Menu
      align="end"
      triggerLabel={chosen ? `Export ${what.toLowerCase()}` : 'Export'}
      triggerClassName="bg-btn bg-btn-secondary bg-btn-sm gap-1.5"
      trigger={
        <>
          <Download size={14} aria-hidden="true" />
          Export
          {chosen && <span className="rounded-full bg-(--accent-soft-bg) px-1.5 bg-caption font-medium text-(--accent-soft-text)">{selectedCount}</span>}
          <ChevronDown size={13} aria-hidden="true" />
        </>
      }
      items={[
        { id: 'scope', label: what, heading: true, onSelect: () => {} },
        { id: 'csv', label: 'Spreadsheet (CSV)', icon: <FileSpreadsheet size={15} />, onSelect: () => onExport('csv') },
        { id: 'pdf', label: pdfName, icon: <FileText size={15} />, onSelect: () => onExport('pdf') },
      ]}
    />
  );
}
