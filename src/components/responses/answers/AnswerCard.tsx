'use client';

import { cn } from '@/lib/utils';
import { urlSettings } from '@/lib/fieldDisplay';
import { answerText, isEmptyItem, isFullWidthItem } from '@/lib/responseView';
import type { AnswerItem } from '@/lib/responseAnswers';
import type { ResponseDensity } from '@/types/responseView';
import { AnswerValue, Highlighted } from './AnswerValue';
import { CopyButton } from './CopyButton';

interface AnswerCardProps {
  item: AnswerItem;
  responseId: string;
  scope: string;
  showNumbers?: boolean;
  density?: ResponseDensity;
  /** The in-response search: matching label and answer text is highlighted. */
  query?: string;
  /** The List layout: a little more room around each row. */
  roomy?: boolean;
}

/** Width rule for the Grid layout: long answers and files take the full row, short ones share it. */
export const isWideAnswer = isFullWidthItem;

/**
 * One answer as a plain row - the label above the value, a hairline below. This is the row of both the Grid and the List layout;
 * the value itself is the shared AnswerValue, so a question looks the same in every layout.
 */
export function AnswerCard({ item, responseId, scope, showNumbers = true, density = 'comfortable', query = '', roomy = false }: AnswerCardProps) {
  const { field } = item;
  const inlineUrl = field?.type === 'url' && urlSettings(field).display === 'inline';
  const copyable = !isEmptyItem(item) && item.files.length === 0;

  return (
    <div className={cn('group min-w-0 border-b border-(--border-subtle)', density === 'compact' ? 'py-1.25' : roomy ? 'py-3.5' : 'py-2.5', isWideAnswer(item) && '@lg:col-span-2')}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="bg-body font-medium text-(--text-secondary) wrap-anywhere">
          {showNumbers && (
            <>
              <span className="text-(--text-muted)">{item.number}.</span>{' '}
            </>
          )}
          <Highlighted text={item.label} query={query} />
        </h4>
        {copyable && <CopyButton text={answerText(item)} label={item.label} />}
      </div>
      <div className={cn('mt-1 min-w-0 text-sm leading-normal text-(--text-primary) wrap-anywhere whitespace-pre-wrap', inlineUrl && 'whitespace-normal')}>
        <AnswerValue item={item} responseId={responseId} scope={scope} query={query} />
      </div>
    </div>
  );
}
