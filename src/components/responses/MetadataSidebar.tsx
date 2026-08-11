'use client';

import { CalendarDays, Hash, Shield, Workflow as WorkflowIcon } from 'lucide-react';
import { StatusDropdown } from './StatusDropdown';
import { formatResponseDate, shortId } from '@/lib/formatters';
import type { ResponseDetail, ResponseStatus } from '@/types/response';

interface MetadataSidebarProps {
  response: ResponseDetail;
  onStatusChange?: (s: ResponseStatus) => void;
  isUpdatingStatus?: boolean;
}

const ORIGIN_TOOLTIP = 'Anonymised origin hash — raw IPs are never stored.';

const SECTION_LABEL = 'flex items-center gap-1.5 text-caption font-semibold text-neutral-500 uppercase tracking-wide';
const CARD = 'flex flex-col gap-3 p-4 bg-white border border-neutral-200 rounded-lg';
const META_ROW = 'flex items-center justify-between gap-3 py-2 border-b border-neutral-100 last:border-0 last:pb-0';
const META_LABEL = 'flex items-center gap-1.5 shrink-0 text-caption text-neutral-500';

export function MetadataSidebar({ response, onStatusChange, isUpdatingStatus }: MetadataSidebarProps) {
  const ipHash = response.ipHash ? response.ipHash.slice(0, 16) : null;

  return (
    <aside className="w-full shrink-0 flex flex-col gap-4">
      {onStatusChange && (
        <div
          role="group"
          aria-labelledby="workflow-status-heading"
          className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3"
        >
          <div className="min-w-0">
            <span id="workflow-status-heading" className={SECTION_LABEL}>
              <WorkflowIcon size={13} />
              Workflow
            </span>
            <span className="mt-1 block text-body-sm font-medium text-neutral-700">Status</span>
          </div>
          <StatusDropdown currentStatus={response.status} onChange={onStatusChange} disabled={isUpdatingStatus} />
        </div>
      )}
      <div className={CARD}>
        <span className={SECTION_LABEL}>Submission</span>

        <div className="flex flex-col">
          <div className={META_ROW}>
            <span className={META_LABEL}>
              <CalendarDays size={13} />
              Date
            </span>
            <span className="text-body-sm text-neutral-700 text-right">{formatResponseDate(response.submittedAt)}</span>
          </div>

          <div className={META_ROW}>
            <span className={META_LABEL} title={ORIGIN_TOOLTIP}>
              <Shield size={13} />
              Origin
            </span>
            <code title={ORIGIN_TOOLTIP} className="font-mono text-caption text-neutral-600 break-all text-right">
              {ipHash ?? '—'}
            </code>
          </div>

          <div className={META_ROW}>
            <span className={META_LABEL}>
              <Hash size={13} />
              Response ID
            </span>
            <code className="font-mono text-caption text-neutral-600">{shortId(response._id)}</code>
          </div>
        </div>
      </div>
    </aside>
  );
}
