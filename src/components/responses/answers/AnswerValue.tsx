'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addressLines, currencyOf, formatCurrency, formatDate, formatDateTime, formatTime12, isDrawnSignature } from '@/lib/fieldDisplay';
import { CLAMP_LINES, needsClamp, splitMatches } from '@/lib/responseView';
import type { AnswerItem } from '@/lib/responseAnswers';
import type { AnswerValue as AnswerValueType } from '@/types/response';
import { FileAnswer } from './FileAnswer';
import { ImageAnswer } from './ImageAnswer';
import { UrlAnswer } from './UrlAnswer';

/** `full` fills the row (Grid, List). `compact` keeps one answer on one line of chips (Table). */
export type AnswerVariant = 'full' | 'compact';

interface AnswerValueProps {
  item: AnswerItem;
  responseId: string;
  scope: string;
  variant?: AnswerVariant;
  /** The in-response search: matching text is highlighted. */
  query?: string;
}

const isEmpty = (v: AnswerValueType): boolean => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
export const Empty = () => <span className="italic text-(--text-muted)">—</span>;

/** Plain text with the search matches marked. Always text, never HTML. */
export function Highlighted({ text, query = '' }: { text: string; query?: string }) {
  if (!query.trim()) return <>{text}</>;
  return (
    <>
      {splitMatches(text, query).map((part, i) =>
        part.match ? (
          <mark key={i} className="rounded-sm bg-(--warning-surface) px-0.5 text-inherit">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

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

/** Long text stops at about 8 lines with "Show more", so one essay never pushes every other answer off screen. */
function ClampedText({ text, query }: { text: string; query: string }) {
  const [open, setOpen] = useState(false);
  if (!needsClamp(text)) return <Highlighted text={text} query={query} />;
  return (
    <span className="block">
      <span className={cn('block whitespace-pre-wrap', !open && 'line-clamp-8')} data-clamped={!open}>
        <Highlighted text={text} query={query} />
      </span>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="mt-1 bg-body-sm font-medium text-(--text-link) hover:underline"
      >
        {open ? 'Show less' : `Show more (${CLAMP_LINES}+ lines)`}
      </button>
    </span>
  );
}

const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;
const telHref = (v: string): string | null => {
  const digits = v.replace(/[^\d+]/g, '');
  return digits.replace(/\D/g, '').length >= 5 ? `tel:${digits}` : null;
};
const LINK = 'text-(--text-link) hover:underline break-all';

function Chips({ values, query }: { values: string[]; query: string }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {values.map((v, i) => (
        <span key={`${v}-${i}`} className="rounded-full bg-(--bg-subtle) px-2.5 py-0.5 bg-body-sm">
          <Highlighted text={String(v)} query={query} />
        </span>
      ))}
    </span>
  );
}

function renderValue(item: AnswerItem, scope: string, variant: AnswerVariant, query: string) {
  const { field, value } = item;
  if (isEmpty(value)) return <Empty />;
  const compact = variant === 'compact';

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
            <span key={i}>
              <Highlighted text={line} query={query} />
            </span>
          ))}
        </span>
      );
    case 'signature':
      return isDrawnSignature(value) ? (
        // eslint-disable-next-line @next/next/no-img-element -- validated PNG data URL, nothing to optimise
        <img src={value} alt="Drawn signature" className={cn('max-w-full rounded-md border border-(--border-default) bg-white object-contain p-1', compact ? 'h-12' : 'h-24')} />
      ) : (
        <span className={cn('font-serif italic', compact ? 'text-lg' : 'text-2xl')}>{String(value)}</span>
      );
    case 'url':
      return <UrlAnswer value={String(value)} field={field} scope={scope} chip={compact} />;
    case 'email': {
      const text = String(value).trim();
      return EMAIL.test(text) ? (
        <a href={`mailto:${text}`} className={LINK}>
          <Highlighted text={text} query={query} />
        </a>
      ) : (
        <Highlighted text={String(value)} query={query} />
      );
    }
    case 'phone': {
      const text = String(value).trim();
      const href = telHref(text);
      return href ? (
        <a href={href} className={LINK}>
          <Highlighted text={text} query={query} />
        </a>
      ) : (
        <Highlighted text={String(value)} query={query} />
      );
    }
    case 'long_text':
      return <ClampedText text={String(value)} query={query} />;
    default:
      return Array.isArray(value) ? <Chips values={value.map(String)} query={query} /> : <ClampedText text={String(value)} query={query} />;
  }
}

/**
 * One answer, by its question type. Every layout arranges this same renderer - none re-implements a type - so Grid, List and
 * Table can never disagree about how a rating, an address or a file looks. Unknown types fall back to plain text.
 */
export function AnswerValue({ item, responseId, scope, variant = 'full', query = '' }: AnswerValueProps) {
  const { field } = item;
  const compact = variant === 'compact';

  if (field?.type === 'image_upload') {
    return item.files.length > 0 ? <ImageAnswer responseId={responseId} field={field} files={item.files} compact={compact} /> : <Empty />;
  }
  if (field?.type === 'file_upload' || (!field && item.files.length > 0)) {
    return item.files.length > 0 ? (
      <div className={cn('flex whitespace-normal', compact ? 'flex-row flex-wrap gap-1.5' : 'flex-col gap-2')}>
        {item.files.map((file) => (
          <FileAnswer key={file.id} responseId={responseId} file={file} compact={compact} />
        ))}
      </div>
    ) : (
      <Empty />
    );
  }
  return <>{renderValue(item, scope, variant, query)}</>;
}
