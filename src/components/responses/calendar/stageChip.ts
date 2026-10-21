import { PERSONAL_DEFAULT_STAGES, isStageColorToken, type StageColorToken, type StageRef } from '@/types/stage';
import type { IResponse } from '@/types/response';

// A response sits on the calendar as a small coloured chip in its stage's colour: the same design-system tokens the stage badges use,
// so both themes are right without any raw colour here.
const CHIP: Record<StageColorToken, string> = {
  primary: 'bg-(--accent-soft) text-(--accent-soft-text)',
  success: 'bg-(--success-surface) text-(--success-text)',
  warning: 'bg-(--warning-surface) text-(--warning-text)',
  error: 'bg-(--error-surface) text-(--error-text)',
  info: 'bg-(--info-surface) text-(--info-text)',
  neutral: 'bg-(--bg-sunken) text-(--text-secondary)',
};

export const chipClass = (colour: string | undefined): string => CHIP[isStageColorToken(colour) ? colour : 'neutral'];

/** The response's stage; a personal response has none, only the raw status that lines up with the default stages. */
export function stageOf(response: IResponse): StageRef | null {
  if (response.stage?.id) return response.stage;
  return PERSONAL_DEFAULT_STAGES.find((s) => s.id === response.status) ?? null;
}
