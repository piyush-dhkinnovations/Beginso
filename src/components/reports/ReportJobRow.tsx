'use client';

import { useState } from 'react';
import { Download, FileText, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/common/Toast';
import { formatRelativeTime } from '@/lib/formatters';
import { reportsService } from '@/services/reports';
import { FORMAT_ICON } from './ReportFormatCard';
import { REPORT_STATUS_LABELS, type ReportJob, type ReportStatus } from '@/types/report';
import { STATUS_LABELS } from '@/types/response';

const STATUS_BADGE_VARIANT: Record<ReportStatus, 'new' | 'completed' | 'closed' | 'draft'> = {
  queued: 'new',
  processing: 'new',
  completed: 'completed',
  failed: 'closed',
  expired: 'draft',
};

const EXPIRED_TOOLTIP = 'This report has expired. Generate a new one.';

const FORMAT_LABEL: Record<string, string> = { csv: 'CSV Export', pdf: 'PDF Report' };

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// The backend never sends a denormalized `formTitle` — only the raw `formId` — so the display
// name is resolved from whatever forms list the caller already has loaded. A `formId` that
// doesn't resolve (e.g. a since-deleted form) falls back to the raw id rather than the
// misleading "All Forms", which would wrongly imply the report wasn't scoped to a form at all.
function scopeLabel(job: ReportJob, formTitleById: Map<string, string>): string {
  const formLabel = job.formId ? (job.formTitle ?? formTitleById.get(job.formId) ?? job.formId) : 'All Forms';
  const parts = [FORMAT_LABEL[job.format] ?? job.format, formLabel];
  if (job.responseStatus) parts.push(STATUS_LABELS[job.responseStatus]);
  if (job.from && job.to) parts.push(`${formatShortDate(job.from)} – ${formatShortDate(job.to)}`);
  return parts.join(' · ');
}

interface ReportJobRowProps {
  job: ReportJob;
  onRetry: (job: ReportJob) => void;
  isRetrying?: boolean;
  formTitleById?: Map<string, string>;
}

export function ReportJobRow({ job, onRetry, isRetrying = false, formTitleById = new Map() }: ReportJobRowProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  // Defensive fallback: the real backend's `format` value has not been confirmed to always match
  // the assumed 'csv' | 'pdf' literal (see docs/status/fix-log.md) — an unrecognized value should
  // fall back to a generic icon rather than crash the whole jobs list.
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

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-neutral-100 last:border-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500" aria-hidden="true">
        <FormatIcon size={16} />
      </span>

      <div className="flex flex-col flex-1 min-w-0 gap-0.5">
        <span className="text-body-sm font-semibold text-neutral-800 truncate">{scopeLabel(job, formTitleById)}</span>
        <span className="text-caption text-neutral-500">Requested {formatRelativeTime(job.createdAt)}</span>
        {job.status === 'failed' && job.errorMessage && (
          <span className="text-caption text-rose-600">{job.errorMessage}</span>
        )}
      </div>

      <Badge variant={STATUS_BADGE_VARIANT[job.status]}>{REPORT_STATUS_LABELS[job.status]}</Badge>

      <div className="shrink-0">
        {job.status === 'completed' && (
          <Button variant="secondary" size="small" onClick={() => void handleDownload()} isLoading={isDownloading}>
            <Download size={14} className="mr-1.5" />
            {isDownloading && downloadProgress ? `Downloading ${downloadProgress}%` : 'Download'}
          </Button>
        )}
        {job.status === 'failed' && (
          <Button variant="secondary" size="small" onClick={() => onRetry(job)} isLoading={isRetrying}>
            <RotateCcw size={14} className="mr-1.5" />
            Retry
          </Button>
        )}
        {job.status === 'expired' && (
          <Button variant="secondary" size="small" disabled title={EXPIRED_TOOLTIP}>
            <Download size={14} className="mr-1.5" />
            Download
          </Button>
        )}
      </div>
    </div>
  );
}
