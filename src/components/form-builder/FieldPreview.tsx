'use client';

import { Calendar, CalendarClock, Clock, Image as ImageIcon, Link2, MapPin, PenLine, Star, Upload } from 'lucide-react';
import type { FormField } from '@/types/form';
import { currencyOf, currencySymbol, imageSettings } from '@/lib/fieldDisplay';

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
          {field.placeholder ||
            (field.type === 'email' ? 'name@example.com' : field.type === 'phone' ? '+1 555 000 0000' : 'Short answer text')}
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
          dd-mm-yyyy
        </div>
      );

    case 'dropdown':
      return (
        <div className={`${inputPreviewClass} max-w-80 justify-between`}>
          <span className="truncate">Select an option ▾</span>
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

    case 'image_upload': {
      const s = imageSettings(field);
      return (
        <div className="rounded-md border border-dashed border-(--border-strong) bg-(--bg-subtle) p-3 flex items-center justify-center gap-2 bg-body-sm font-medium text-(--text-muted)">
          <ImageIcon size={16} className="text-(--text-muted) shrink-0" />
          {s.allowMultiple ? `Upload up to ${s.maxImages} images` : 'Upload an image'}
        </div>
      );
    }

    case 'url':
      return (
        <div className={`${inputPreviewClass} max-w-80`}>
          <Link2 size={14} className="text-(--text-disabled) shrink-0" />
          {field.placeholder || 'https://example.com'}
        </div>
      );

    case 'rating':
      return (
        <div className="flex items-center gap-1 text-(--text-disabled)" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={20} />
          ))}
        </div>
      );

    case 'yes_no':
      return (
        <div className="flex gap-2">
          {['Yes', 'No'].map((label) => (
            <span key={label} className="min-w-20 rounded-md border border-(--border-default) bg-(--bg-subtle) px-4 py-1.5 text-center bg-body-sm text-(--text-secondary)">
              {label}
            </span>
          ))}
        </div>
      );

    case 'time':
      return (
        <div className={`${inputPreviewClass} max-w-45`}>
          <Clock size={14} className="text-(--text-disabled) shrink-0" />
          hh:mm
        </div>
      );

    case 'datetime':
      return (
        <div className={`${inputPreviewClass} max-w-60`}>
          <CalendarClock size={14} className="text-(--text-disabled) shrink-0" />
          dd-mm-yyyy, hh:mm
        </div>
      );

    case 'currency':
      return (
        <div className={`${inputPreviewClass} max-w-60`}>
          <span className="font-semibold text-(--text-secondary)">{currencySymbol(currencyOf(field))}</span>
          {field.placeholder || '0.00'}
        </div>
      );

    case 'address':
      return (
        <div className="grid max-w-120 grid-cols-2 gap-2">
          <div className={`${inputPreviewClass} col-span-2`}>
            <MapPin size={14} className="text-(--text-disabled) shrink-0" />
            Street
          </div>
          {['City', 'State', 'ZIP / PIN'].map((part) => (
            <div key={part} className={inputPreviewClass}>{part}</div>
          ))}
        </div>
      );

    case 'signature':
      return (
        <div className="flex h-20 max-w-80 items-end rounded-md border border-dashed border-(--border-strong) bg-(--bg-subtle) px-3 pb-2 bg-body-sm text-(--text-muted)">
          <PenLine size={14} className="mr-2 shrink-0" />
          Sign here
        </div>
      );

    default:
      return null;
  }
}
