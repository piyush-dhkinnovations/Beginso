import { Star } from 'lucide-react';
import { StageBadge } from './StageBadge';
import { RespondentFromProvider } from './RespondentFromContext';
import { RespondentCell, RowLead, TagsCell, AssigneeCell, SubmittedCell } from './ResponseRow';
import { answerFor, textFields } from '@/lib/answerText';
import { detectRespondentIdentity, shortId } from '@/lib/formatters';
import { questionOfColumn, type TableBuiltinColumn, type TableColumnKey } from '@/types/responseSetup';
import { bx } from '@/lib/utils';
import type { FormField } from '@/types/form';
import type { IResponse } from '@/types/response';

/** The header of each built-in table column. */
export const COLUMN_LABELS: Record<TableBuiltinColumn, string> = {
  respondent: 'Respondent',
  email: 'Email',
  tags: 'Tags',
  assignee: 'Assignee',
  stage: 'Stage',
  submitted: 'Submitted',
  score: 'Average score',
  notes: 'Notes',
  reference: 'Reference ID',
};

/** The header of a column: its built-in name, or the question's own label. A question that is gone has no header, so the column is dropped. */
export function columnLabel(key: TableColumnKey, fields: readonly FormField[] | undefined): string | undefined {
  const fieldId = questionOfColumn(key);
  if (fieldId) return textFields(fields).find((f) => f.fieldId === fieldId)?.label || undefined;
  return COLUMN_LABELS[key as TableBuiltinColumn];
}

interface ColumnCellProps {
  columnKey: TableColumnKey;
  response: IResponse;
  fields: readonly FormField[] | undefined;
  respondentFrom?: string;
  /** Long answers wrap onto several lines instead of being cut off with an ellipsis. */
  wrap?: boolean;
  /** This is the first column of the table: it carries the person's picture and the unread dot, whatever it shows. */
  lead?: boolean;
}

/**
 * What one column shows for one response. The Responses table and the preview in Customize both draw their cells from here, so
 * the preview is the table: what you see while choosing is what you get.
 */
export function ResponseColumnCell({ columnKey, response, fields, respondentFrom, wrap = false, lead = false }: ColumnCellProps) {
  const cell = <ColumnContent columnKey={columnKey} response={response} fields={fields} respondentFrom={respondentFrom} wrap={wrap} />;
  if (!lead) return cell;
  return respondentFrom ? (
    <RespondentFromProvider value={respondentFrom}>
      <RowLead response={response}>{cell}</RowLead>
    </RespondentFromProvider>
  ) : (
    <RowLead response={response}>{cell}</RowLead>
  );
}

function ColumnContent({ columnKey, response, fields, respondentFrom, wrap }: Omit<ColumnCellProps, 'lead'>) {
  const fieldId = questionOfColumn(columnKey);
  if (fieldId) {
    const field = textFields(fields).find((f) => f.fieldId === fieldId);
    const text = field ? answerFor(response.answers, fields, field) : undefined;
    if (!text) return <span className="text-(--text-muted)">—</span>;
    return (
      <span className={bx('block', wrap ? 'max-w-96 whitespace-normal break-words' : 'max-w-72 truncate')} title={wrap ? undefined : text}>
        {text}
      </span>
    );
  }
  switch (columnKey) {
    case 'respondent':
      // The cell reads the form's choice from context; a preview of an unsaved choice passes it here instead.
      return respondentFrom ? (
        <RespondentFromProvider value={respondentFrom}>
          <RespondentCell response={response} withAvatar={false} />
        </RespondentFromProvider>
      ) : (
        <RespondentCell response={response} withAvatar={false} />
      );
    case 'email':
      return <>{detectRespondentIdentity(response.answers, fields as FormField[] | undefined, response.respondentEmail, respondentFrom).email ?? '—'}</>;
    case 'tags':
      return <TagsCell tags={response.tags} />;
    case 'assignee':
      return <AssigneeCell response={response} />;
    case 'stage':
      return <StageBadge stage={response.stage} status={response.status} />;
    case 'submitted':
      return <SubmittedCell response={response} />;
    case 'score': {
      const average = response.scoreAverage;
      const reviewers = response.scoreCount ?? 0;
      return typeof average === 'number' ? (
        // A star, the average, and how many reviewers it is the average of: the same star the rating answers use.
        <span className="inline-flex items-center gap-1 tabular-nums" title={reviewers > 0 ? `Average of ${reviewers} reviewer${reviewers === 1 ? '' : 's'}` : undefined}>
          <Star size={14} aria-hidden="true" className="shrink-0 fill-current text-(--warning)" />
          <span>{average.toFixed(1)}</span>
          {reviewers > 0 && <span className="text-(--text-muted)">({reviewers})</span>}
        </span>
      ) : (
        <span className="text-(--text-muted)">—</span>
      );
    }
    case 'reference':
      return <code className="font-mono bg-body-sm text-(--text-secondary)">{response.reference ?? `#${shortId(response._id)}`}</code>;
    case 'notes':
      return (response.noteCount ?? 0) > 0 ? <span className="tabular-nums">{response.noteCount}</span> : <span className="text-(--text-muted)">—</span>;
    default:
      return null;
  }
}
