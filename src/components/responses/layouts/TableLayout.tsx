import { cn } from '@/lib/utils';
import { answerText, isEmptyItem } from '@/lib/responseView';
import { AnswerValue, Highlighted } from '../answers/AnswerValue';
import { CopyButton } from '../answers/CopyButton';
import type { ResponseLayoutProps } from './types';

/**
 * One row per question: the question on the left (30%), the answer on the right (70%), thin dividers, and a header row that names the two
 * columns so nobody has to guess which is which. Links become small cards, files become chips.
 */
export function TableLayout({ items, responseId, scope, showNumbers, density, query }: ResponseLayoutProps) {
  const pad = density === 'compact' ? 'py-1.25' : 'py-2.5';
  if (items.length === 0) return null; // no answers: no table, not a header row over nothing
  return (
    <table className="w-full table-fixed border-collapse text-left">
      <caption className="sr-only">Submitted answers, one question per row</caption>
      <colgroup>
        <col className="w-[30%]" />
        <col className="w-[70%]" />
      </colgroup>
      <thead>
        <tr className="border-b border-(--border-default) bg-(--bg-subtle)">
          <th scope="col" className="px-3 py-2 bg-caption font-semibold text-(--text-muted)">Question</th>
          <th scope="col" className="px-3 py-2 bg-caption font-semibold text-(--text-muted)">Answer</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const copyable = !isEmptyItem(item) && item.files.length === 0;
          return (
            <tr key={item.key} className="group border-b border-(--border-subtle) last:border-b-0">
              <th scope="row" className={cn('pl-3 pr-4 align-top bg-body font-medium text-(--text-secondary) wrap-anywhere', pad)}>
                {showNumbers && (
                  <>
                    <span className="text-(--text-muted)">{item.number}.</span>{' '}
                  </>
                )}
                <Highlighted text={item.label} query={query} />
              </th>
              <td className={cn('px-3 align-top text-sm leading-normal text-(--text-primary) wrap-anywhere whitespace-pre-wrap', pad)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 whitespace-pre-wrap">
                    <AnswerValue item={item} responseId={responseId} scope={scope} variant="compact" query={query} />
                  </div>
                  {copyable && <CopyButton text={answerText(item)} label={item.label} />}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
