import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { FormsDialogs } from '@/components/forms/FormsDialogs';
import { makeForm, makeState } from './formsTestUtils';

type Props = Record<string, unknown>;
const calls = vi.hoisted(() => ({
  move: [] as Props[],
  share: [] as Props[],
  del: [] as Props[],
  tpl: [] as Props[],
}));

vi.mock('@/components/workspaces/MoveFormModal', () => ({ MoveFormModal: (p: Props) => { calls.move.push(p); return null; } }));
vi.mock('@/components/team/FormAccessPanel', () => ({ FormAccessPanel: (p: Props) => { calls.share.push(p); return null; } }));
vi.mock('@/components/form-builder/DeleteFormModal', () => ({ DeleteFormModal: (p: Props) => { calls.del.push(p); return null; } }));
vi.mock('@/components/templates/PublishTemplateModal', () => ({ PublishTemplateModal: (p: Props) => { calls.tpl.push(p); return null; } }));

const last = (a: Props[]) => a[a.length - 1];

describe('FormsDialogs', () => {
  it('every dialog is closed with blank identifiers when no form is targeted', () => {
    Object.values(calls).forEach((a) => (a.length = 0));
    render(<FormsDialogs s={makeState()} context={{ type: 'personal' }} />);
    expect(last(calls.move)).toMatchObject({ isOpen: false, formId: '', formTitle: '' });
    expect(last(calls.share)).toMatchObject({ isOpen: false, formId: '' });
    expect(calls.del[0]).toMatchObject({ isOpen: false, formTitle: '' });
    expect(last(calls.tpl)).toMatchObject({ isOpen: false, scope: '', formId: '' });
  });

  it('opens each dialog for its own target form and passes the context through', () => {
    const f = makeForm({ _id: 'm', title: 'Moved' });
    const s = makeState({ formToMove: f, formToShare: makeForm({ _id: 's', title: 'Shared' }), formToTemplate: makeForm({ _id: 't', title: 'Tpl' }) });
    render(<FormsDialogs s={s} context={{ type: 'workspace', workspaceId: 'w1' }} />);
    expect(last(calls.move)).toMatchObject({ isOpen: true, formId: 'm', formTitle: 'Moved', currentContext: { type: 'workspace', workspaceId: 'w1' } });
    expect(last(calls.share)).toMatchObject({ isOpen: true, formId: 's' });
    expect(last(calls.tpl)).toMatchObject({ isOpen: true, formId: 't', scope: 'w1' });
    (last(calls.move).onClose as () => void)();
    expect(s.setFormToMove).toHaveBeenCalledWith(null);
  });

  it('single delete confirm deletes the form then dismisses; shows its response count', () => {
    const f = makeForm({ _id: 'd', title: 'Doomed', responseCount: 9 });
    const s = makeState({ formToDelete: f, deletingId: 'd' });
    render(<FormsDialogs s={s} context={{ type: 'personal' }} />);
    const single = calls.del[calls.del.length - 2];
    expect(single).toMatchObject({ isOpen: true, formTitle: 'Doomed', responseCount: 9, isDeleting: true });
    (single.onConfirm as () => void)();
    expect(s.deleteMutation.mutate).toHaveBeenCalledWith('d');
    expect(s.setFormToDelete).toHaveBeenCalledWith(null);
  });

  it('bulk delete confirm passes the selected ids and count', () => {
    const s = makeState({ bulkDeleteConfirming: true, selectedIds: new Set(['a', 'b']) });
    render(<FormsDialogs s={s} context={{ type: 'personal' }} />);
    const bulk = last(calls.del);
    expect(bulk).toMatchObject({ isOpen: true, count: 2, isDeleting: false });
    (bulk.onConfirm as () => void)();
    expect(s.bulkDeleteMutation.mutate).toHaveBeenCalledWith(['a', 'b']);
    (bulk.onClose as () => void)();
    expect(s.setBulkDeleteConfirming).toHaveBeenCalledWith(false);
  });
});
