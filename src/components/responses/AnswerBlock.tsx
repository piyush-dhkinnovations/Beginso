import type { AnswerValue } from '@/types/response';

interface AnswerBlockProps {
  label: string;
  value: AnswerValue;
}

function renderValue(value: AnswerValue) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-(--text-disabled) italic">—</span>;
  }
  return Array.isArray(value) ? value.join(', ') : String(value);
}

export function AnswerBlock({ label, value }: AnswerBlockProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-(--border-subtle) last:border-0">
      <span className="bg-body-sm text-(--text-muted) shrink-0">{label}</span>
      <span className="bg-body-sm font-medium text-(--text-primary) text-right break-words whitespace-pre-wrap min-w-0 flex-1">
        {renderValue(value)}
      </span>
    </div>
  );
}
