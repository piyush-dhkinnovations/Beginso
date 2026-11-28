/**
 * Unsaved builder changes are kept in the browser: written as the person edits, brought back after a reload or crash,
 * never over a newer saved version without asking, shown by the preview, and removed once saved or discarded.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, screen, act, fireEvent } from '@testing-library/react';

vi.mock('@/services/forms', () => ({ formsService: { updateForm: vi.fn() } }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { formsService } from '@/services/forms';
import { useBuilderStore } from '@/store/builderStore';
import { useBuilderBackup, BACKUP_DELAY_MS } from '@/components/form-builder/useBuilderBackup';
import { saveBuilderNow } from '@/components/form-builder/useBuilderAutosave';
import { UnsavedChangesNotice } from '@/components/form-builder/UnsavedChangesNotice';
import { readBackup, useUnsavedPreview, writeBackup, type BuilderBackup } from '@/lib/builderBackup';
import { resetPendingEdits } from '@/lib/pendingEdits';
import type { Form } from '@/types/form';

const store = () => useBuilderStore.getState();
const saved = (over: Partial<Form> = {}) =>
  ({
    _id: 'f1', workspaceId: null, title: 'Saved title', status: 'draft', contentVersion: 3,
    fields: [{ fieldId: 'q', pageId: 'p1', type: 'short_text', label: 'Name', order: 0 }],
    pages: [{ id: 'p1', order: 0, title: 'P' }], branding: {}, settings: { honeypotEnabled: true }, ...over,
  }) as unknown as Form;
const wait = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const kept = (over: Partial<BuilderBackup> = {}): BuilderBackup => ({
  userId: 'me', savedAt: Date.now(), baseVersion: 3, baseDraftSavedAt: null,
  draft: { formTitle: 'My unsaved title', fields: saved().fields, pages: saved().pages, branding: {}, settings: { honeypotEnabled: true } },
  ...over,
});
/** The builder as it opens: the saved form is loaded, then the browser copy is looked at. */
const open = (userId = 'me') => renderHook(() => useBuilderBackup('f1', userId, true));

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  resetPendingEdits();
  vi.mocked(formsService.updateForm).mockReset().mockResolvedValue({ contentVersion: 4 } as never);
  useBuilderStore.setState({ formId: null, dirty: false });
  store().initForm(saved());
});
afterEach(() => vi.useRealTimers());

describe('keeping unsaved changes', () => {
  it('writes them shortly after a change, and not while everything is saved', async () => {
    open();
    await wait(1000);
    expect(readBackup('f1', 'me')).toBeNull();
    act(() => store().setFormTitle('Edited'));
    await wait(BACKUP_DELAY_MS + 10);
    expect(readBackup('f1', 'me')).toMatchObject({ baseVersion: 3, draft: { formTitle: 'Edited' } });
  });

  it('writes at once when the page is closing', () => {
    open();
    act(() => store().setFormTitle('Closing'));
    act(() => void window.dispatchEvent(new Event('pagehide')));
    expect(readBackup('f1', 'me')?.draft.formTitle).toBe('Closing');
  });

  it('removes the copy once the changes are saved', async () => {
    open();
    act(() => store().setFormTitle('Edited'));
    await wait(BACKUP_DELAY_MS + 10);
    await act(() => saveBuilderNow());
    await wait(BACKUP_DELAY_MS + 10);
    expect(readBackup('f1', 'me')).toBeNull();
  });
});

describe('opening a form with changes kept in this browser', () => {
  it('puts them back as unsaved changes', () => {
    writeBackup('f1', kept());
    const { result } = open();
    expect(store()).toMatchObject({ formTitle: 'My unsaved title', dirty: true });
    expect(result.current.restoredAt).not.toBeNull();
    expect(result.current.conflict).toBeNull();
  });

  it('discarding them shows the saved form again and removes the copy', async () => {
    writeBackup('f1', kept());
    const { result } = open();
    act(() => result.current.discard(saved()));
    await wait(1000);
    expect(store()).toMatchObject({ formTitle: 'Saved title', dirty: false });
    expect(readBackup('f1', 'me')).toBeNull();
  });

  it.each([
    ['the version moved', { baseVersion: 2 }],
    ['the staged draft was rewritten', { baseDraftSavedAt: '2026-01-01T00:00:00Z' }],
  ])('asks before putting them over a newer saved copy (%s)', (_why, over) => {
    writeBackup('f1', kept(over));
    const { result } = open();
    expect(store()).toMatchObject({ formTitle: 'Saved title', dirty: false });
    expect(result.current.conflict).not.toBeNull();
    act(() => result.current.restoreMine());
    expect(store()).toMatchObject({ formTitle: 'My unsaved title', dirty: true, contentVersion: 3 });
  });

  it('never offers them to another person on the same browser', () => {
    writeBackup('f1', kept());
    const { result } = open('someone-else');
    expect(store().formTitle).toBe('Saved title');
    expect(result.current.restoredAt).toBeNull();
  });

  it('leaves the editor alone when it still holds newer changes from this visit', () => {
    writeBackup('f1', kept());
    store().setFormTitle('Newer, in memory');
    open();
    expect(store().formTitle).toBe('Newer, in memory');
  });

  it('forgets a copy that matches what is saved', () => {
    const s = store();
    writeBackup('f1', kept({ draft: { formTitle: s.formTitle, fields: s.fields, pages: s.pages, branding: s.branding, settings: s.settings } }));
    const { result } = open();
    expect(result.current.restoredAt).toBeNull();
    expect(readBackup('f1', 'me')).toBeNull();
  });

  it('ignores a damaged copy', () => {
    localStorage.setItem('beginso.builderDraft.f1', '{"userId":"me","draft":{}}');
    open();
    expect(store().formTitle).toBe('Saved title');
  });
});

describe('the preview', () => {
  const preview = () => renderHook(() => useUnsavedPreview('f1', 'me', saved()));

  it('draws the saved form when nothing is unsaved', () => {
    const { result } = preview();
    expect(result.current).toMatchObject({ unsaved: false, form: { title: 'Saved title' } });
  });

  it('draws unsaved changes over it, follows further changes, and keeps them on screen once saved', () => {
    writeBackup('f1', kept());
    const { result } = preview();
    expect(result.current).toMatchObject({ unsaved: true, form: { title: 'My unsaved title', status: 'draft' } });

    act(() => writeBackup('f1', kept({ draft: { ...kept().draft, formTitle: 'Typed since' } })));
    expect(result.current.form?.title).toBe('Typed since');

    act(() => {
      localStorage.removeItem('beginso.builderDraft.f1');
      window.dispatchEvent(new Event('storage'));
    });
    expect(result.current).toMatchObject({ unsaved: false, form: { title: 'Typed since' } });
  });
});

describe('what the builder says about them', () => {
  it('offers Save now and Discard after a restore', () => {
    const [onSave, onDiscard] = [vi.fn(), vi.fn()];
    render(<UnsavedChangesNotice restoredAt={Date.now()} conflict={null} onSave={onSave} onDiscard={onDiscard} onRestore={() => {}} />);
    expect(screen.getByText('Your unsaved changes are back.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard them' }));
    expect(onSave).toHaveBeenCalled();
    expect(onDiscard).toHaveBeenCalled();
  });

  it('asks which version to keep when the form changed since', () => {
    const [onDiscard, onRestore] = [vi.fn(), vi.fn()];
    render(<UnsavedChangesNotice restoredAt={null} conflict={kept()} onSave={() => {}} onDiscard={onDiscard} onRestore={onRestore} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use my changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep the saved version' }));
    expect(onRestore).toHaveBeenCalled();
    expect(onDiscard).toHaveBeenCalled();
  });
});
