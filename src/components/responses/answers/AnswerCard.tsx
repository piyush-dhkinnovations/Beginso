'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  addressLines,
  currencyOf,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime12,
  isDrawnSignature,
  urlSettings,
} from '@/lib/fieldDisplay';
import type { AnswerItem } from '@/lib/responseAnswers';
import type { AnswerValue } from '@/types/response';
import { FileAnswer } from './FileAnswer';
import { ImageAnswer } from './ImageAnswer';
import { UrlAnswer } from './UrlAnswer';

interface AnswerCardProps {
  item: AnswerItem;
  responseId: string;
  scope: string;
}

const isEmpty = (v: AnswerValue): boolean => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
const Empty = () => <span className="italic text-(--text-disabled)">—</span>;

function Stars({ value }: { value: number }) {
  return (
    <span role="img" aria-label={`${value} out of 5`} className="inline-flex items-center gap-0.5 text-(--warning-text)">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={16} aria-hidden="true" className={n <= value ? 'fill-current' : 'text-(--border-strong)'} />
      ))}
      <span className="ml-1.5 bg-body-sm font-medium text-(--text-primary)">{value} / 5</span>
    </span>
  );
}

function renderValue(item: AnswerItem, scope: string) {
  const { field, value } = item;
  if (isEmpty(value)) return <Empty />;

  switch (field?.type) {
    case 'rating': {
      const n = Number(value);
      return Number.isFinite(n) ? <Stars value={Math.max(0, Math.min(5, Math.round(n)))} /> : String(value);
    }
    case 'currency': {
      const n = Number(value);
      return Number.isFinite(n) ? formatCurrency(n, currencyOf(field)) : String(value);
    }
    case 'time':
      return formatTime12(String(value));
    case 'datetime':
      return formatDateTime(String(value));
    case 'date':
      return formatDate(String(value));
    case 'address':
      return (
        <span className="flex flex-col">
          {addressLines(String(value)).map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </span>
      );
    case 'signature':
      return isDrawnSignature(value) ? (
        // eslint-disable-next-line @next/next/no-img-element -- validated PNG data URL, nothing to optimise
        <img src={value} alt="Drawn signature" className="h-24 max-w-full rounded-md border border-(--border-default) bg-white object-contain p-1" />
      ) : (
        <span className="font-serif text-2xl italic">{String(value)}</span>
      );
    case 'url':
      return <UrlAnswer value={String(value)} field={field} scope={scope} />;
    default:
      return Array.isArray(value) ? (
        <span className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span key={v} className="rounded-full bg-(--bg-subtle) px-2.5 py-0.5 bg-body-sm">{v}</span>
          ))}
        </span>
      ) : (
        String(value)
      );
  }
}

// Types that need the full row; everything else can sit two-per-row on a wide drawer.
const WIDE = new Set(['long_text', 'address', 'url', 'image_upload', 'file_upload', 'signature', 'checkbox', 'multiple_choice']);

export function isWideAnswer(item: AnswerItem): boolean {
  if (item.field && WIDE.has(item.field.type)) return true;
  return typeof item.value === 'string' && (item.value.length > 40 || item.value.includes('\n'));
}

/**
 * One answer as a plain row — small label over the value, separated from the next by a hairline — laid out per its
 * field type and Display & Preview settings (see lib/fieldDisplay.ts). No icon and no card per field: the list
 * is one surface, so a long form stays compact and easy to scan.
 */
export function AnswerCard({ item, responseId, scope }: AnswerCardProps) {
  const { field } = item;
  const inlineUrl = field?.type === 'url' && urlSettings(field).display === 'inline';

  return (
    <div className={cn('min-w-0 border-b border-(--border-subtle) py-3', isWideAnswer(item) && '@2xl:col-span-2')}>
      <h4 className="bg-caption font-medium text-(--text-muted)">
        {item.number}. {item.label}
      </h4>
      <div className={cn('mt-1 min-w-0 bg-body-sm text-(--text-primary) wrap-break-word whitespace-pre-wrap', inlineUrl && 'whitespace-normal')}>
        {field?.type === 'image_upload' ? (
          item.files.length > 0 ? <ImageAnswer responseId={responseId} field={field} files={item.files} /> : <Empty />
        ) : field?.type === 'file_upload' || (!field && item.files.length > 0) ? (
          item.files.length > 0 ? (
            <div className="flex flex-col gap-2 whitespace-normal">
              {item.files.map((file) => (
                <FileAnswer key={file.id} responseId={responseId} file={file} />
              ))}
            </div>
          ) : (
            <Empty />
          )
        ) : (
          renderValue(item, scope)
        )}
      </div>
    </div>
  );
}
