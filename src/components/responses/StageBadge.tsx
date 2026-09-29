import { Badge } from '@/components/ui/Badge';
import type { StageRef } from '@/types/stage';

export interface StageBadgeProps {
  stage: StageRef | null | undefined;
  className?: string;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.1 (1.1), design.md §6/§15. Thin wrapper over
 * `ui/Badge` — the stage's own colour (a design-system token name, never raw hex, OQ-10) picks the
 * variant. An unknown/deleted stage id (or a stage not yet loaded) renders a neutral "Unknown
 * stage" chip and never throws — the one rule every §7.1 consumer must hold.
 */
export function StageBadge({ stage, className }: StageBadgeProps) {
  if (!stage || !stage.id) {
    return (
      <Badge variant="neutral" dot pill className={className}>
        Unknown stage
      </Badge>
    );
  }

  return (
    <Badge variant={stage.colour} dot pill className={className}>
      {stage.name}
    </Badge>
  );
}
