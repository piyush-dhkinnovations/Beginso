import type { SessionSummary } from '@/types/settings';
import { formatResponseDate } from '@/lib/formatters';
import { Badge } from '@/components/ui/Badge';
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
          <p className="text-body-sm font-semibold text-neutral-800 truncate">{session.deviceLabel}</p>
          {session.isCurrent && <Badge variant="neutral">This device</Badge>}
        </div>
        <p className="text-caption text-neutral-500">
          {/* Defensive: only trust a real string — a live crash showed the backend can send `{}`
              for an unresolved location instead of null, which `?? fallback` doesn't catch since
              `{}` is truthy, and React can't render a bare object as a child. */}
          {typeof session.approxLocation === 'string' ? session.approxLocation : 'Unknown location'} · Last active {formatResponseDate(session.lastActiveAt)}
        </p>
      </div>
      {!session.isCurrent && (
        <Button
          variant="secondary"
          size="small"
          onClick={() => onRevoke(session.id)}
          isLoading={isRevoking}
          aria-label={`Revoke session on ${session.deviceLabel}`}
        >
          Revoke
        </Button>
      )}
    </div>
  );
}
