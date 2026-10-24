import { bx } from '@/lib/utils';
import type { StageColorToken } from '@/types/stage';

/** The dot of a stage colour: the same colour the stage's badge text uses, so a dot and its badge always match. */
const DOT: Record<StageColorToken, string> = {
  neutral: 'bg-(--text-muted)',
  primary: 'bg-(--action-primary)',
  info: 'bg-(--info-text)',
  success: 'bg-(--success-text)',
  warning: 'bg-(--warning-text)',
  error: 'bg-(--error-text)',
};

export function StageDot({ colour, size = 10 }: { colour: StageColorToken; size?: number }) {
  return <span aria-hidden="true" className={bx('inline-block shrink-0 rounded-full', DOT[colour] ?? DOT.neutral)} style={{ width: size, height: size }} />;
}
