import { Badge } from '@/components/ui/Badge';

// Sprint 13 (CF5.5), wireframe 41. "{n} days left" — the final THREE days are badged in the warning
// style. Text, never colour alone. `daysLeft` is computed by the server; this only formats it.
export function RetentionBadge({ daysLeft }: { daysLeft: number }) {
  const final = daysLeft <= 3;
  const label = daysLeft <= 0 ? 'Removed soon' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
  return (
    <Badge variant={final ? 'warning' : 'neutral'} title="Permanently removed after this">
      {label}
    </Badge>
  );
}
