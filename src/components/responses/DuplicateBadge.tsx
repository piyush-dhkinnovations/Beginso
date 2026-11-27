import { Copy } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

/**
 * Extracted from the inline
 * markup `ResponseSignals` already carried (this is the one place `duplicateOfId` renders a
 * badge, so Table/Board/Calendar can't independently drift — `ResponseSignals`'s own
 * precedent for every other signal).
 */
export function DuplicateBadge({ className }: { className?: string }) {
  return (
    <Badge variant="warning" pill className={className ?? 'shrink-0 gap-1'}>
      <Copy size={11} aria-hidden="true" />
      Duplicate
    </Badge>
  );
}
