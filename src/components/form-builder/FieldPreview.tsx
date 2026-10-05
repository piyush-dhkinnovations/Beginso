'use client';

import { Calendar, ChevronDown, Upload } from 'lucide-react';
import type { FormField } from '@/types/form';

// ─── Live, non-interactive preview of a field's public-form appearance ────────
// Rendered inside FieldCard for every field, selected or not — shows what a
// respondent would actually see, mirroring the field's current configuration
// (placeholder text, options, etc). Purely decorative — no inputs, no state.

const inputPreviewClass =
  'h-8.5 rounded-md border border-(--border-default) bg-(--bg-subtle) flex items-center gap-2 px-3 bg-body-sm text-(--text-muted) truncate';

function OptionMarker({ shape }: { shape: 'round' | 'square' }) {
  return (
    <span
      className={`size-3.75 border-[1.5px] border-(--border-strong) shrink-0 ${
        shape === 'round' ? 'rounded-full' : 'rounded'
      }`}
    />
  );
}

export function FieldPreview({ field }: { field: FormField }) {
  switch (field.type) {
    case 'short_text':
    case 'email':
    case 'phone':
      return (
        <div className={`${inputPreviewClass} max-w-80`}>
          {field.placeholder || 'Short answer text'}
        </div>
      );

    case 'long_text':
      return (
        <div className="min-h-13 rounded-md border border-(--border-default) bg-(--bg-subtle) px-3 py-2 bg-body-sm text-(--text-muted)">
          {field.placeholder || 'Long answer text'}
        </div>
      );

    case 'number':
      return (
        <div className={`${inputPreviewClass} max-w-45`}>
          {field.placeholder || '0'}
        </div>
      );

    case 'date':
      return (
        <div className={`${inputPreviewClass} max-w-45`}>
          <Calendar size={14} className="text-(--text-disabled) shrink-0" />
          mm / dd / yyyy
        </div>
      );

    case 'dropdown':
      return (
        <div className={`${inputPreviewClass} max-w-80 justify-between`}>
          <span className="truncate">Select an option</span>
          <ChevronDown size={14} className="text-(--text-disabled) shrink-0" />
        </div>
      );

    case 'multiple_choice':
    case 'checkbox': {
      const options = field.options ?? [];
      const shown = options.slice(0, 3);
      const remaining = options.length - 3;
      return (
        <div className="flex flex-col gap-1.5">
          {shown.map((opt, i) => (
            <div key={i} className="flex items-center gap-2 bg-body-sm text-(--text-secondary)">
              <OptionMarker shape={field.type === 'multiple_choice' ? 'round' : 'square'} />
              <span className="truncate">{opt}</span>
            </div>
          ))}
          {remaining > 0 && (
            <span className="bg-caption text-(--text-muted) pl-5.75">+ {remaining} more</span>
          )}
        </div>
      );
    }

    case 'file_upload':
      return (
        <div className="rounded-md border border-dashed border-(--border-strong) bg-(--bg-subtle) p-3 flex items-center justify-center gap-2 bg-body-sm font-medium text-(--text-muted)">
          <Upload size={16} className="text-(--text-muted) shrink-0" />
          Upload a file
        </div>
      );

    default:
      return null;
  }
}
