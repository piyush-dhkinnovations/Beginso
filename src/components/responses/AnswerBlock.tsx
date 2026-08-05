import type { AnswerValue } from '@/types/response';

interface AnswerBlockProps {
  label: string;
  value: AnswerValue;
}

function renderValue(value: AnswerValue) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-neutral-400 italic">—</span>;
  }
  return Array.isArray(value) ? value.join(', ') : String(value);
}

export function AnswerBlock({ label, value }: AnswerBlockProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-neutral-100 last:border-0">
      <span className="text-body-sm text-neutral-500 shrink-0">{label}</span>
      <span className="text-body-sm font-medium text-neutral-800 text-right break-words whitespace-pre-wrap">
        {renderValue(value)}
      </span>
    </div>
  );
}
