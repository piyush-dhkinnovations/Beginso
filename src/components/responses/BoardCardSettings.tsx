'use client';

import { useState } from 'react';
import { DndContext } from '@dnd-kit/core';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { BoardCard } from './BoardCard';
import { cardFields, DEFAULT_BOARD_CARD, type BoardCardConfig } from '@/lib/boardCard';
import { responsesService } from '@/services/responses';
import type { FormField } from '@/types/form';
import type { IResponse } from '@/types/response';

interface BoardCardSettingsProps {
  scope: string;
  formId: string;
  fields: readonly FormField[] | undefined;
  config: BoardCardConfig;
  onChange: (next: BoardCardConfig) => void;
}

/** A response to show the card on while choosing: the latest real one, or (a form with none yet) one made up from the questions. */
function sampleResponse(real: IResponse | undefined, formId: string, fields: readonly FormField[]): IResponse {
  if (real) return real;
  return {
    _id: 'sample',
    formId,
    reference: '#1',
    answers: Object.fromEntries(fields.map((f) => [f.label, `Sample ${f.label.toLowerCase()}`])),
    assignee: null,
    tags: [],
    unread: true,
    duplicateOfId: null,
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as IResponse;
}

/**
 * "Card fields": the question that headlines every Board card. A live preview of the card sits above the choice and changes as it is
 * made, and so does the board behind the dialog. The choice is per form and kept in this browser.
 */
export function BoardCardSettings({ scope, formId, fields, config, onChange }: BoardCardSettingsProps) {
  const [open, setOpen] = useState(false);
  const choices = cardFields(fields);
  const { data: latest } = useQuery({
    queryKey: ['board-card-sample', scope, formId],
    queryFn: () => responsesService.getResponses({ formId, page: 1, limit: 1 }, scope),
    enabled: open,
    staleTime: 60_000,
  });
  if (choices.length === 0) return null;

  const customised = config.title !== 'auto';

  return (
    <>
      <Button variant={customised ? 'secondary' : 'ghost'} size="small" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <SlidersHorizontal size={14} className="mr-1.5" aria-hidden="true" />
        Card fields
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Card fields" description="Choose what each card on the board shows. Saved for this form on this device.">
        <div className="flex flex-col gap-5">
          <div className="rounded-xl bg-(--bg-subtle) p-4" aria-label="Card preview" role="group">
            <div className="pointer-events-none mx-auto w-full max-w-72" aria-hidden="true">
              <DndContext>
                <BoardCard
                  response={sampleResponse(latest?.data[0], formId, choices)}
                  stages={[]}
                  stageId="preview"
                  canAct
                  onView={() => {}}
                  onChangeStage={() => {}}
                  config={config}
                />
              </DndContext>
            </div>
          </div>

          <Select id="board-card-title" label="Title" value={config.title} onChange={(e) => onChange({ title: e.target.value })}>
            <option value="auto">Respondent name, or email</option>
            {choices.map((f) => (
              <option key={f.fieldId} value={f.fieldId}>
                {f.label || 'Untitled question'}
              </option>
            ))}
          </Select>

          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => onChange(DEFAULT_BOARD_CARD)} disabled={!customised}>
              Reset
            </Button>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
