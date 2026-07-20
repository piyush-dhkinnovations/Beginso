'use client';

import { Calendar, ChevronDown, Upload } from 'lucide-react';
import type { FormField } from '@/types/form';

// ─── Live, non-interactive preview of a field's public-form appearance ────────
// Rendered inside FieldCard for every field, selected or not — shows what a
// respondent would actually see, mirroring the field's current configuration
// (placeholder text, options, etc). Purely decorative — no inputs, no state.

const inputPreviewClass =
  'h-[34px] rounded-md border border-neutral-200 bg-neutral-50 flex items-center gap-2 px-3 text-body-sm text-neutral-500 truncate';

function OptionMarker({ shape }: { shape: 'round' | 'square' }) {
  return (
    <span
      className={`w-[15px] h-[15px] border-[1.5px] border-neutral-300 shrink-0 ${
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
        <div className={`${inputPreviewClass} max-w-[320px]`}>
          {field.placeholder || 'Short answer text'}
        </div>
      );

    case 'long_text':
      return (
        <div className="min-h-[52px] rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-body-sm text-neutral-500">
          {field.placeholder || 'Long answer text'}
        </div>
      );

    case 'number':
      return (
        <div className={`${inputPreviewClass} max-w-[180px]`}>
          {field.placeholder || '0'}
        </div>
      );

    case 'date':
      return (
        <div className={`${inputPreviewClass} max-w-[180px]`}>
          <Calendar size={14} className="text-neutral-400 shrink-0" />
          mm / dd / yyyy
        </div>
      );

    case 'dropdown':
      return (
        <div className={`${inputPreviewClass} max-w-[320px] justify-between`}>
          <span className="truncate">Select an option</span>
          <ChevronDown size={14} className="text-neutral-400 shrink-0" />
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
            <div key={i} className="flex items-center gap-2 text-body-sm text-neutral-600">
              <OptionMarker shape={field.type === 'multiple_choice' ? 'round' : 'square'} />
              <span className="truncate">{opt}</span>
            </div>
          ))}
          {remaining > 0 && (
            <span className="text-caption text-neutral-500 pl-[23px]">+ {remaining} more</span>
          )}
        </div>
      );
    }

    case 'file_upload':
      return (
        <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-3 flex items-center justify-center gap-2 text-body-sm font-medium text-neutral-500">
          <Upload size={16} className="text-neutral-500 shrink-0" />
          Upload a file
        </div>
      );

    default:
      return null;
  }
}
