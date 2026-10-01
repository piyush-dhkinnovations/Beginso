import type { SessionSummary } from '@/types/settings';
import { formatApproxLocation, formatResponseDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';

interface SessionRowProps {
  session: SessionSummary;
  onRevoke: (id: string) => void;
  isRevoking: boolean;
}

// Correctness Property 5: the current session never renders a Revoke action — a user can't
// revoke the session they're viewing this page from (they'd use Logout for that).
export function SessionRow({ session, onRevoke, isRevoking }: SessionRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 min-h-11 py-2">
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <p className="bg-body-sm font-semibold text-(--text-primary) truncate">{session.deviceLabel}</p>
          {session.isCurrent && <StatusBadge variant="neutral">This device</StatusBadge>}
        </div>
        <p className="bg-caption text-(--text-muted)">
          {formatApproxLocation(session.approxLocation)} · Last active {formatResponseDate(session.lastActiveAt)}
        </p>
      </div>
      {/* Always rendered (never conditionally omitted) so every row reserves the same height —
          Button's 44px touch-target floor is taller than this row's two lines of text, so an
          absent button let the current-device row shrink shorter than every other row. Hidden via
          `invisible` (not omitted) for the current session: visibility:hidden keeps the layout
          space but drops it from the accessibility tree and tab order, so it stays true that the
          current session never exposes a working Revoke control (Correctness Property 5). */}
      <Button
        variant="secondary"
        size="small"
        onClick={() => onRevoke(session.id)}
        isLoading={isRevoking}
        aria-label={`Revoke session on ${session.deviceLabel}`}
        className={session.isCurrent ? 'invisible' : undefined}
        tabIndex={session.isCurrent ? -1 : undefined}
      >
        Revoke
      </Button>
    </div>
  );
}
