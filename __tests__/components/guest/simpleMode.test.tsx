/**
 * Guest "simple mode": the form is the editor. One centred canvas, no field palette or pages column, a short "+ Add question"
 * menu on every width, no way to add sections, and one quiet line when a template brings sections or logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/hooks/useNarrow', () => ({ useNarrow: () => false }));

import { SimpleCanvas } from '@/components/guest/SimpleCanvas';
import { useBuilderStore } from '@/store/builderStore';
import type { Form } from '@/types/form';

const field = (fieldId: string, label: string, pageId: string, extra: Record<string, unknown> = {}) =>
  ({ fieldId, label, type: 'short_text', pageId, required: false, deleted: false, order: 0, ...extra });

const load = (pages: { id: string; order: number; title?: string }[], fields: unknown[]) =>
  useBuilderStore.getState().initForm({
    _id: '', workspaceId: null, title: 'T', status: 'draft', fields, pages, branding: {}, settings: { honeypotEnabled: true },
    schemaVersion: 1, responseCount: 0, createdAt: '', updatedAt: '',
  } as unknown as Form);

beforeEach(() => load([{ id: 'p1', order: 0, title: 'T' }], [field('a', 'Name', 'p1')]));

describe('simple canvas', () => {
  it('offers + Add question on a wide screen: the common types open under the button, Esc closes them', () => {
    render(<SimpleCanvas setTitle={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: '+ Add question' }));
    for (const label of ['Short Text', 'Long Text', 'Email', 'Phone', 'Multiple Choice', 'Dropdown', 'Rating', 'Date', 'File Upload']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'More types' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: '+ Add question' }).parentElement!, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Long Text' })).not.toBeInTheDocument();
  });

  it('picking a type adds that question and closes the menu', () => {
    render(<SimpleCanvas setTitle={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: '+ Add question' }));
    fireEvent.click(screen.getByRole('button', { name: 'Email' }));
    expect(useBuilderStore.getState().fields.filter((f) => !f.deleted).map((f) => f.type)).toEqual(['short_text', 'email']);
    expect(screen.queryByRole('button', { name: 'Long Text' })).not.toBeInTheDocument();
  });

  it('does not let a guest add sections, and has no field palette', () => {
    render(<SimpleCanvas setTitle={() => undefined} />);
    expect(screen.queryByRole('button', { name: /Add section/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Basic fields')).not.toBeInTheDocument();
    expect(screen.queryByText('More fields')).not.toBeInTheDocument();
  });

  it('a single-section form has no "more options" line', () => {
    render(<SimpleCanvas setTitle={() => undefined} />);
    expect(screen.queryByText(/available after you sign up/)).not.toBeInTheDocument();
  });

  it('a template with several sections still shows them, and says more options come after sign-up', () => {
    load([{ id: 'p1', order: 0, title: 'One' }, { id: 'p2', order: 1, title: 'Two' }], [field('a', 'Name', 'p1'), field('b', 'Diet', 'p2')]);
    render(<SimpleCanvas setTitle={() => undefined} />);
    expect(screen.getByLabelText('Section title')).toHaveValue('Two');
    expect(screen.getByText('More options (logic, multiple pages, settings) are available after you sign up.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add section/ })).not.toBeInTheDocument();
  });

  it('a template with conditional logic gets the same quiet line', () => {
    load([{ id: 'p1', order: 0, title: 'T' }], [field('a', 'Name', 'p1', { logicRules: [{ id: 'r', action: 'show', targetFieldId: 'a', condition: { fieldId: 'a', operator: 'equals', value: 'x' } }] })]);
    render(<SimpleCanvas setTitle={() => undefined} />);
    expect(screen.getByText(/available after you sign up/)).toBeInTheDocument();
  });

  it('the confirmation message is edited under the form and stored with the form settings', () => {
    render(<SimpleCanvas setTitle={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Message after someone submits'), { target: { value: 'Thanks!' } });
    expect(useBuilderStore.getState().settings.successMessage).toBe('Thanks!');
  });
});
