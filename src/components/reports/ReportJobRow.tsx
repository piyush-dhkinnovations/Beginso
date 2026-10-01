'use client';

import { useState } from 'react';
import { Download, FileText, Info, Loader2, RotateCcw } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { formatRelativeTime } from '@/lib/formatters';
import { detectDateRangePreset } from '@/lib/dateRange';
import { reportsService } from '@/services/reports';
import { FORMAT_ICON } from './ReportFormatCard';
import { REPORT_STATUS_LABELS, type ReportJob, type ReportStatus } from '@/types/report';
import { CATEGORY_LABELS } from '@/types/stage';

const STATUS_BADGE_VARIANT: Record<ReportStatus, 'new' | 'completed' | 'closed' | 'draft'> = {
  queued: 'new',
  processing: 'new',
  completed: 'completed',
  failed: 'closed',
  expired: 'draft',
};

const EXPIRED_TOOLTIP = 'This report has expired. Generate a new one.';
const FORMAT_SHORT_LABEL: Record<string, string> = { csv: 'CSV', pdf: 'PDF' };
const PRESET_LABEL: Record<string, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
};

// Link-style action button shared by Download/Retry — a `ghost` Button keeps the 44px accessible
// hit target the rest of the app relies on, just recolored to read as a text link.
const ACTION_LINK_CLASS = 'text-(--accent-soft-text) hover:text-(--accent-soft-text) hover:bg-(--accent-soft)';

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// The backend never sends a denormalized `formTitle` — only the raw `formId` — so the display
// name is resolved from whatever forms list the caller already has loaded. A `formId` that
// doesn't resolve (e.g. a since-deleted form) falls back to the raw id rather than the
// misleading "All Forms", which would wrongly imply the report wasn't scoped to a form at all.
function formLabel(job: ReportJob, formTitleById: Map<string, string>): string {
  return job.formId ? (job.formTitle ?? formTitleById.get(job.formId) ?? job.formId) : 'All Forms';
}

// Reuses the same preset detection the Analytics date-range filter already does, so a job whose
// from/to happens to match "Last 30 days" etc. reads as a friendly label instead of raw dates.
function scopeSubtitle(job: ReportJob): string {
  const parts: string[] = [];
  // `job.stage` (a name snapshot) wins; `responseStatus` is only read for a job created before
  // this sprint (OQ-2's deprecated-status alias) — mapped through the same fixed category labels
  // StatusDistributionChart.tsx uses, since it's still the removed union's literal value.
  if (job.stage) parts.push(job.stage.name);
  else if (job.responseStatus) parts.push(CATEGORY_LABELS[job.responseStatus]);
  if (job.from && job.to) {
    const preset = detectDateRangePreset(job.from, job.to);
    parts.push(preset === 'custom' ? `${formatShortDate(job.from)} – ${formatShortDate(job.to)}` : PRESET_LABEL[preset]);
  } else {
    parts.push('All time');
  }
  return parts.join(' · ');
}

interface ReportJobRowProps {
  job: ReportJob;
  onRetry: (job: ReportJob) => void;
  isRetrying?: boolean;
  formTitleById?: Map<string, string>;
  /** `row` renders a `<tr>` for the desktop table; `card` renders a standalone stacked card for
   * narrow viewports. Both share the same download/retry logic below. */
  variant?: 'row' | 'card';
}

export function ReportJobRow({ job, onRetry, isRetrying = false, formTitleById = new Map(), variant = 'row' }: ReportJobRowProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  // Defensive fallback: the real backend's `format` value has not been confirmed to always match
  // the assumed 'csv' | 'pdf' literal — an unrecognized value should fall back to a generic icon
  // rather than crash the whole jobs list.
  const FormatIcon = FORMAT_ICON[job.format] ?? FileText;

  // Never cached across clicks (Correctness Property 5) — every click re-fetches a fresh blob URL.
  async function handleDownload() {
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      const blobUrl = await reportsService.getReportFileBlobUrl(job._id, setDownloadProgress);
      if (job.format === 'pdf') {
        window.open(blobUrl, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `report-${job._id}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(blobUrl);
      }
    } catch {
      toast('Failed to download report. Please try again.', 'error');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  }

  let action: React.ReactNode;
  if (job.status === 'completed') {
    action = (
      <Button variant="ghost" size="small" className={ACTION_LINK_CLASS} onClick={() => void handleDownload()} isLoading={isDownloading}>
        <Download size={14} className="mr-1.5" />
        {isDownloading && downloadProgress ? `Downloading ${downloadProgress}%` : 'Download'}
      </Button>
    );
  } else if (job.status === 'failed') {
    action = (
      <Button variant="ghost" size="small" className={ACTION_LINK_CLASS} onClick={() => onRetry(job)} isLoading={isRetrying}>
        <RotateCcw size={14} className="mr-1.5" />
        Retry
      </Button>
    );
  } else if (job.status === 'expired') {
    // "Unavailable" rather than "Expired" — the Status column already shows an "Expired" badge
    // in this same row, and a second, identically-worded element would collide for anyone
    // querying by accessible name (screen reader or test alike).
    action = (
      <Button variant="ghost" size="small" disabled title={EXPIRED_TOOLTIP} className="text-(--text-disabled)">
        <Info size={14} className="mr-1.5" />
        Unavailable
      </Button>
    );
  } else if (job.status === 'processing') {
    action = (
      <span className="inline-flex items-center gap-1.5 bg-caption text-(--text-disabled)">
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        Preparing…
      </span>
    );
  } else {
    action = <span className="bg-caption text-(--text-disabled)">—</span>;
  }

  const title = formLabel(job, formTitleById);
  const subtitle = scopeSubtitle(job);
  const created = formatRelativeTime(job.createdAt);
  const formatText = FORMAT_SHORT_LABEL[job.format] ?? job.format;

  if (variant === 'card') {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-(--border-default) bg-(--surface-card) p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="bg-body-sm font-semibold text-(--text-primary) truncate">{title}</p>
            <p className="bg-caption text-(--text-muted)">{subtitle}</p>
          </div>
          <StatusBadge variant={STATUS_BADGE_VARIANT[job.status]}>{REPORT_STATUS_LABELS[job.status]}</StatusBadge>
        </div>
        {job.status === 'failed' && job.errorMessage && <p className="bg-caption text-(--error-text)">{job.errorMessage}</p>}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 bg-caption text-(--text-muted)">
            <FormatIcon size={14} className="text-(--text-disabled)" aria-hidden="true" />
            {formatText} · {created}
          </span>
          {action}
        </div>
      </div>
    );
  }

  return (
    <tr className="border-b border-(--border-subtle) last:border-0">
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-2 bg-body-sm text-(--text-secondary) whitespace-nowrap">
          <FormatIcon size={16} className="text-(--text-disabled)" aria-hidden="true" />
          {formatText}
        </span>
      </td>
      <td className="px-4 py-3">
        <p className="bg-body-sm font-semibold text-(--text-primary) truncate max-w-70">{title}</p>
        <p className="bg-caption text-(--text-muted) truncate max-w-70">{subtitle}</p>
        {job.status === 'failed' && job.errorMessage && (
          <p className="bg-caption text-(--error-text) truncate max-w-70">{job.errorMessage}</p>
        )}
      </td>
      <td className="px-4 py-3 bg-body-sm text-(--text-muted) whitespace-nowrap">{created}</td>
      <td className="px-4 py-3">
        <StatusBadge variant={STATUS_BADGE_VARIANT[job.status]}>{REPORT_STATUS_LABELS[job.status]}</StatusBadge>
      </td>
      <td className="px-4 py-3 text-right">{action}</td>
    </tr>
  );
}
