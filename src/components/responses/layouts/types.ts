import type { AnswerItem } from '@/lib/responseAnswers';
import type { ResponseDensity } from '@/types/responseView';

/** What every layout receives. A layout only arranges answers; it never re-implements how one type is drawn. */
export interface ResponseLayoutProps {
  items: AnswerItem[];
  responseId: string;
  scope: string;
  showNumbers: boolean;
  density: ResponseDensity;
  query: string;
}
