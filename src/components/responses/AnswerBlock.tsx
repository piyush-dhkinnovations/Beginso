import type { AnswerValue } from '@/types/response';

interface AnswerBlockProps {
  label: string;
  value: AnswerValue;
}

export function AnswerBlock({ label, value }: AnswerBlockProps) {
  return (
    <div className="flex flex-col gap-1 p-4 bg-white border border-neutral-200 rounded-lg">
      <span className="text-heading-3 font-semibold text-neutral-800">{label}</span>
      {value === null || value === undefined || value === '' ? (
        <span className="text-neutral-400 italic">—</span>
      ) : Array.isArray(value) ? (
        <p className="text-body text-neutral-700">{value.join(', ')}</p>
      ) : (
        <p className="text-body text-neutral-700 whitespace-pre-wrap">{String(value)}</p>
      )}
    </div>
  );
}
