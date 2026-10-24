import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { BoardCard } from '@/components/responses/BoardCard';
import type { FormField } from '@/types/form';
import type { IResponse } from '@/types/response';

const field = (fieldId: string, label: string, type: FormField['type'] = 'short_text') =>
  ({ fieldId, label, type, pageId: 'p', required: false, deleted: false, order: 0 }) as FormField;
const FIELDS = [field('n', 'Full name'), field('t', 'Title of the film'), field('g', 'Genre'), field('b', 'Budget', 'number')];
vi.mock('@/hooks/useFormFields', () => ({ useFormFields: () => FIELDS }));

const STAGE = { id: 's1', name: 'New', colour: 'info', category: 'new' } as const;
const RESPONSE = {
  _id: 'r1',
  formId: 'f1',
  reference: '#1168',
  stage: STAGE,
  assignee: null,
  tags: [],
  noteCount: 0,
  unread: false,
  duplicateOfId: null,
  answers: { 'Full name': 'Asha Rao', 'Title of the film': 'Monsoon Road', Genre: 'Drama', Budget: 5000000 },
  submittedAt: '2026-09-01T00:00:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
} as unknown as IResponse;

function card(props: Partial<React.ComponentProps<typeof BoardCard>> = {}, response = RESPONSE) {
  return render(
    <DndContext>
      <BoardCard response={response} stages={[STAGE]} stageId="s1" canAct onView={vi.fn()} onChangeStage={vi.fn()} {...props} />
    </DndContext>
  );
}

describe('BoardCard', () => {
  it('headlines the respondent by default, with the reference under it', () => {
    card();
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('#1168')).toBeInTheDocument();
  });

  it('headlines the chosen question', () => {
    card({ cardTitle: 't' });
    expect(screen.getByRole('button', { name: /Open response from\s*Monsoon Road/ })).toBeInTheDocument();
    expect(screen.queryByText('Drama')).not.toBeInTheDocument();
  });

  it('falls back to who it is from when the chosen question was left blank', () => {
    card({ cardTitle: 't' }, { ...RESPONSE, answers: { 'Full name': 'Asha Rao' } } as IResponse);
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
  });

  it('puts the drag handle first, before the title', () => {
    card();
    const handle = screen.getByRole('button', { name: /Drag Asha Rao/ });
    const open = screen.getByRole('button', { name: /Open response from/ });
    expect(handle.compareDocumentPosition(open) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('has no drag handle for a reader', () => {
    card({ canAct: false });
    expect(screen.queryByRole('button', { name: /Drag/ })).not.toBeInTheDocument();
  });

  it('draws the drop line only when asked', () => {
    const { container, unmount } = card({ line: 'above' });
    expect(container.querySelector('[aria-hidden="true"].h-0\\.5')).not.toBeNull();
    unmount();
    const plain = card();
    expect(plain.container.querySelector('[aria-hidden="true"].h-0\\.5')).toBeNull();
  });
});
