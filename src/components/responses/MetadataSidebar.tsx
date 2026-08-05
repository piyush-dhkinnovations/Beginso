'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatusSelector } from './StatusSelector';
import { formatResponseDate } from '@/lib/formatters';
import { STATUS_LABELS, type ResponseDetail, type ResponseStatus } from '@/types/response';

interface MetadataSidebarProps {
  response: ResponseDetail;
  onStatusChange: (s: ResponseStatus) => void;
  onDeleteClick: () => void;
  isUpdatingStatus: boolean;
}

const ORIGIN_TOOLTIP = 'Anonymised origin hash — raw IPs are never stored.';

export function MetadataSidebar({ response, onStatusChange, onDeleteClick, isUpdatingStatus }: MetadataSidebarProps) {
  const ipHash = response.ipHash.slice(0, 16);

  return (
    <aside className="w-full md:w-[280px] shrink-0 flex flex-col gap-4 p-4 bg-white border border-neutral-200 rounded-lg md:border-l md:border-t-0 md:rounded-none md:rounded-r-lg">
      <div className="flex flex-col gap-2">
        <h3 className="text-heading-3 font-semibold text-neutral-800">Status</h3>
        <Badge variant={response.status}>{STATUS_LABELS[response.status]}</Badge>
        <StatusSelector currentStatus={response.status} onChange={onStatusChange} disabled={isUpdatingStatus} />
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-heading-3 font-semibold text-neutral-800">Submitted</h3>
        <p className="text-body-sm text-neutral-600">{formatResponseDate(response.submittedAt)}</p>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-heading-3 font-semibold text-neutral-800">Origin</h3>
        <code title={ORIGIN_TOOLTIP} className="font-mono text-caption text-neutral-600 break-all">
          {ipHash}
        </code>
        <p className="text-caption text-neutral-400 mt-0.5">{ORIGIN_TOOLTIP}</p>
      </div>

      <Button variant="destructive" size="small" className="w-full mt-2" onClick={onDeleteClick}>
        Delete Response
      </Button>
    </aside>
  );
}
