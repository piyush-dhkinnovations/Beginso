import { Badge } from '@/components/ui/Badge';
import { PERSONAL_DEFAULT_STAGES, type StageRef } from '@/types/stage';

export interface StageBadgeProps {
  stage: StageRef | null | undefined;
  /** Personal responses have no Stage document; their raw `status` lines up with the default stages. */
  status?: string | null;
  className?: string;
}

/**
 * Thin wrapper over
 * `ui/Badge` — the stage's own colour (a design-system token name, never raw hex) picks the
 * variant. An unknown/deleted stage id (or a stage not yet loaded) renders a neutral "Unknown
 * stage" chip and never throws — the one rule every consumer must hold.
 */
export function StageBadge({ stage: stageProp, status, className }: StageBadgeProps) {
  const stage = stageProp?.id ? stageProp : PERSONAL_DEFAULT_STAGES.find((s) => s.id === status) ?? stageProp;
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
