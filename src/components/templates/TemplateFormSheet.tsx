import type { ReactNode } from 'react';
import { CalendarDays, ChevronDown, Clock, Star, Upload } from 'lucide-react';
import type { FormField } from '@/types/form';
import { bx } from '@/lib/utils';

// A static, non-interactive picture of a template's questions as the respondent would see them: each field's label
// above a control that matches its type (text box, dropdown with its first option, radio / checkbox rows, stars...).
// Used full size in the preview dialog and as a small cropped thumbnail on the template card.

const box = 'flex min-h-9 items-center justify-between gap-2 rounded-md border border-(--border-default) bg-(--surface-card) px-3 text-(--text-muted)';

function Choice({ options, round }: { options: string[]; round: boolean }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {options.slice(0, 4).map((o) => (
        <li key={o} className="flex items-center gap-2 bg-body-sm text-(--text-secondary)">
          <span className={bx('size-4 shrink-0 border border-(--border-strong) bg-(--surface-card)', round ? 'rounded-full' : 'rounded')} />
          <span className="truncate">{o}</span>
        </li>
      ))}
      {options.length > 4 && <li className="bg-caption text-(--text-muted)">+{options.length - 4} more</li>}
    </ul>
  );
}

function Control({ field }: { field: FormField }): ReactNode {
  const hint = field.placeholder ?? '';
  switch (field.type) {
    case 'long_text':
    case 'address':
      return <div className={bx(box, 'min-h-20 items-start py-2')}><span className="bg-body-sm">{hint}</span></div>;
    case 'dropdown':
      return (
        <div className={box}>
          <span className="truncate bg-body-sm">{field.options[0] ?? 'Select…'}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </div>
      );
    case 'multiple_choice':
      return <Choice options={field.options} round />;
    case 'checkbox':
      return <Choice options={field.options} round={false} />;
    case 'yes_no':
      return <Choice options={['Yes', 'No']} round />;
    case 'rating':
      return (
        <div className="flex gap-1 text-(--border-strong)">
          {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={22} aria-hidden="true" />)}
        </div>
      );
    case 'file_upload':
    case 'image_upload':
    case 'signature':
      return (
        <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-(--border-strong) px-3 py-4 bg-body-sm text-(--text-muted)">
          <Upload size={16} aria-hidden="true" />
          {field.type === 'signature' ? 'Sign here' : 'Upload a file'}
        </div>
      );
    case 'date':
    case 'datetime':
      return <div className={box}><span className="bg-body-sm">{hint || 'dd / mm / yyyy'}</span><CalendarDays size={16} aria-hidden="true" /></div>;
    case 'time':
      return <div className={box}><span className="bg-body-sm">{hint || '--:--'}</span><Clock size={16} aria-hidden="true" /></div>;
    default:
      return <div className={box}><span className="truncate bg-body-sm">{hint}</span></div>;
  }
}

interface TemplateFormSheetProps {
  fields: FormField[];
  /** Show only the first few fields, tightly spaced, with a fade at the bottom (the card thumbnail). */
  compact?: boolean;
}

export function TemplateFormSheet({ fields, compact }: TemplateFormSheetProps) {
  const shown = fields.filter((f) => !f.deleted);
  const list = compact ? shown.slice(0, 3) : shown;
  return (
    <div className={bx('flex flex-col', compact ? 'gap-2.5' : 'gap-5')}>
      {list.map((field, i) => (
        <div key={field.fieldId ?? i} className="flex flex-col gap-1.5">
          <span className="bg-label text-(--text-primary)">
            {field.label}
            {field.required && <span className="ml-1 text-(--error-text)" aria-label="required">*</span>}
          </span>
          {!compact && field.helpText && <span className="bg-caption text-(--text-muted)">{field.helpText}</span>}
          <div aria-hidden="true">
            <Control field={field} />
          </div>
        </div>
      ))}
    </div>
  );
}
