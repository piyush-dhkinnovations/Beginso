import { AnswerCard } from '../answers/AnswerCard';
import type { ResponseLayoutProps } from './types';

/** One column, label above the answer, a little more room. Best for reading long answers. */
export function ListLayout({ items, responseId, scope, showNumbers, density, query }: ResponseLayoutProps) {
  return (
    <div className="flex flex-col [&>*:last-child]:border-b-0">
      {items.map((item) => (
        <AnswerCard key={item.key} item={item} responseId={responseId} scope={scope} showNumbers={showNumbers} density={density} query={query} roomy />
      ))}
    </div>
  );
}
