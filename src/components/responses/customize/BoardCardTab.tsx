'use client';

import { DndContext } from '@dnd-kit/core';
import { Select } from '@/components/ui/Select';
import { BoardCard } from '../BoardCard';
import { RespondentFromProvider } from '../RespondentFromContext';
import { textFields } from '@/lib/answerText';
import type { Draft } from './draft';
import type { FormField } from '@/types/form';
import type { IResponse } from '@/types/response';
import type { StageRef } from '@/types/stage';

interface BoardCardTabProps {
  draft: Draft;
  onChange: (next: Draft) => void;
  fields: readonly FormField[] | undefined;
  previewRows: IResponse[];
  previewIsSample: boolean;
  stage: StageRef | undefined;
}

/** What headlines every card on the Board, with the real card (not a drawing of one) above the choice. */
export function BoardCardTab({ draft, onChange, fields, previewRows, previewIsSample, stage }: BoardCardTabProps) {
  const choices = textFields(fields);
  const { cardTitle, respondentFrom } = draft.values;

  return (
    <div className="flex flex-col gap-6">
      <Select
        id="card-title"
        label="Card title"
        value={cardTitle}
        onChange={(e) => onChange({ ...draft, values: { ...draft.values, cardTitle: e.target.value } })}
      >
        <option value="auto">Respondent name, or email</option>
        {choices.map((f) => (
          <option key={f.fieldId} value={f.fieldId}>
            {f.label || 'Untitled question'}
          </option>
        ))}
      </Select>

      <section aria-labelledby="card-preview" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="card-preview" className="bg-body font-semibold text-(--text-primary)">Preview</h3>
          <p className="bg-body-sm text-(--text-muted)">
            {previewIsSample ? 'This form has no responses yet, so these are examples. ' : 'Your latest responses. '}
            Everyone who opens this board sees the same cards. A card whose answer is blank shows the respondent instead.
          </p>
        </div>
        <div className="rounded-xl bg-(--bg-subtle) p-4" role="group" aria-label="Card preview">
          <RespondentFromProvider value={respondentFrom}>
            <div className="pointer-events-none mx-auto flex w-full max-w-80 flex-col gap-2" aria-hidden="true">
              <DndContext>
                {previewRows.slice(0, 3).map((r) => (
                  <BoardCard key={r._id} response={r} stages={[]} stageId={stage?.id ?? 'preview'} canAct onView={() => {}} onChangeStage={() => {}} cardTitle={cardTitle} />
                ))}
              </DndContext>
            </div>
          </RespondentFromProvider>
        </div>
      </section>
    </div>
  );
}
