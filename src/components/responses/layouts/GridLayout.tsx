import { AnswerCard } from '../answers/AnswerCard';
import type { ResponseLayoutProps } from './types';

/** Two columns where the card is wide enough: short answers share a row, long ones take the whole row. */
export function GridLayout({ items, responseId, scope, showNumbers, density, query }: ResponseLayoutProps) {
  return (
    <div className="grid grid-cols-1 gap-x-8 @lg:grid-cols-2 [&>*:last-child]:border-b-0">
      {items.map((item) => (
        <AnswerCard key={item.key} item={item} responseId={responseId} scope={scope} showNumbers={showNumbers} density={density} query={query} />
      ))}
    </div>
  );
}
