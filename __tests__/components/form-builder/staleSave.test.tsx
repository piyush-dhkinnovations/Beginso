import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AxiosError } from 'axios';

vi.mock('@/services/forms', () => ({ formsService: { updateForm: vi.fn(), getFormById: vi.fn() } }));

import { formsService } from '@/services/forms';
import { saveFormSnapshot, syncBuilderVersion } from '@/components/form-builder/useBuilderAutosave';
import { SaveIndicator } from '@/components/form-builder/SaveIndicator';
import { useBuilderStore } from '@/store/builderStore';
import type { Form } from '@/types/form';

const updateForm = formsService.updateForm as ReturnType<typeof vi.fn>;
const getFormById = formsService.getFormById as ReturnType<typeof vi.fn>;

const form = (contentVersion: number): Form =>
  ({
    _id: 'f1', workspaceId: 'w', title: 'T', description: '', status: 'draft', fields: [], pages: [], branding: {},
    settings: { honeypotEnabled: true }, schemaVersion: 1, responseCount: 0, createdAt: '', updatedAt: '', contentVersion,
  }) as Form;

const snap = () => {
  const s = useBuilderStore.getState();
  return { fields: s.fields, formTitle: s.formTitle, pages: s.pages, branding: s.branding, settings: s.settings };
};
const httpError = (status: number, data: unknown = {}) =>
  new AxiosError('http', String(status), undefined, undefined, { status, statusText: '', headers: {}, config: {} as never, data });
const staleError = () => httpError(409, { success: false, error: { code: 'FORM_STALE', message: 'changed' }, contentVersion: 9 });
const networkError = () => new AxiosError('Network Error', 'ERR_NETWORK'); // no response at all

beforeEach(() => {
  vi.clearAllMocks();
  useBuilderStore.getState().initForm(form(1));
});

describe('a save never sends a field that points at a page that is gone', () => {
  it('moves it to the first page first, which also heals a form that is already stuck on "does not exist in pages"', async () => {
    updateForm.mockResolvedValue({ contentVersion: 2 });
    const s = snap();
    const stuck = [{ fieldId: 'f-live', pageId: s.pages[0].id, label: 'Live', type: 'short_text', required: false, deleted: false, order: 0 }, { fieldId: 'f-orphan', pageId: 'removed-page', label: 'Old', type: 'short_text', required: false, deleted: true, order: 1 }];
    await saveFormSnapshot('f1', { ...s, fields: stuck as never });
    const sent = updateForm.mock.calls[0][1];
    const ids = new Set(sent.pages.map((p: { id: string }) => p.id));
    expect(sent.fields.every((f: { pageId: string }) => ids.has(f.pageId))).toBe(true);
    expect(sent.fields.find((f: { fieldId: string }) => f.fieldId === 'f-orphan').pageId).toBe(s.pages[0].id);
  });
});

describe('versioned saves (QA A4b-002)', () => {
  it('sends the version it is based on plus a saveId, and adopts the version the server returns', async () => {
    updateForm.mockResolvedValue({ contentVersion: 2 });
    await saveFormSnapshot('f1', snap());
    const sent = updateForm.mock.calls[0][1];
    expect(sent.expectedContentVersion).toBe(1);
    expect(typeof sent.saveId).toBe('string');
    expect(useBuilderStore.getState().contentVersion).toBe(2);
  });

  it("a user's own consecutive saves are queued and never conflict with each other", async () => {
    let releaseFirst!: (v: unknown) => void;
    updateForm.mockImplementationOnce(() => new Promise((r) => (releaseFirst = r))).mockResolvedValueOnce({ contentVersion: 3 });

    const first = saveFormSnapshot('f1', snap());
    const second = saveFormSnapshot('f1', snap()); // sent while the first is still in flight
    await Promise.resolve();
    expect(updateForm).toHaveBeenCalledTimes(1); // the second waits

    releaseFirst({ contentVersion: 2 });
    await Promise.all([first, second]);
    expect(updateForm).toHaveBeenCalledTimes(2);
    expect(updateForm.mock.calls[0][1].expectedContentVersion).toBe(1);
    expect(updateForm.mock.calls[1][1].expectedContentVersion).toBe(2); // not the stale 1
    expect(useBuilderStore.getState().stale).toBe(false);
  });

  it('two tabs: the tab holding the old version is refused, stops saving, and keeps its edits', async () => {
    updateForm.mockRejectedValueOnce(staleError());
    useBuilderStore.getState().setFormTitle('My unsaved edit');

    await expect(saveFormSnapshot('f1', snap())).rejects.toBeDefined();
    expect(useBuilderStore.getState().stale).toBe(true);
    expect(useBuilderStore.getState().formTitle).toBe('My unsaved edit'); // nothing discarded
    expect(useBuilderStore.getState().dirty).toBe(true);

    updateForm.mockClear();
    await expect(saveFormSnapshot('f1', snap())).rejects.toBeDefined();
    expect(updateForm).not.toHaveBeenCalled(); // never retried automatically, never overwrites
  });

  it('reloading (a fresh initForm with the server version) resumes normal saving', async () => {
    updateForm.mockRejectedValueOnce(staleError());
    await saveFormSnapshot('f1', snap()).catch(() => undefined);
    expect(useBuilderStore.getState().stale).toBe(true);

    useBuilderStore.getState().initForm(form(9));
    expect(useBuilderStore.getState().stale).toBe(false);
    updateForm.mockResolvedValue({ contentVersion: 10 });
    await saveFormSnapshot('f1', snap());
    expect(updateForm).toHaveBeenLastCalledWith('f1', expect.objectContaining({ expectedContentVersion: 9 }));
  });

  it('a 409 is never retried', async () => {
    updateForm.mockRejectedValue(staleError());
    await saveFormSnapshot('f1', snap()).catch(() => undefined);
    expect(updateForm).toHaveBeenCalledTimes(1);
  });

  it('a server error is not a conflict and is not retried', async () => {
    updateForm.mockRejectedValue(httpError(500));
    await saveFormSnapshot('f1', snap()).catch(() => undefined);
    expect(useBuilderStore.getState().stale).toBe(false);
    expect(updateForm).toHaveBeenCalledTimes(1);
  });
});

describe('a save whose reply was lost', () => {
  it('is retried once with the SAME version and saveId, and the answer is adopted', async () => {
    updateForm.mockRejectedValueOnce(networkError()).mockResolvedValueOnce({ contentVersion: 2 });
    await saveFormSnapshot('f1', snap());
    expect(updateForm).toHaveBeenCalledTimes(2);
    const [a, b] = [updateForm.mock.calls[0][1], updateForm.mock.calls[1][1]];
    expect(b.saveId).toBe(a.saveId);
    expect(b.expectedContentVersion).toBe(1);
    expect(useBuilderStore.getState().contentVersion).toBe(2);
    expect(useBuilderStore.getState().stale).toBe(false);
  });

  it('gives up after one retry, without calling it a conflict', async () => {
    updateForm.mockRejectedValue(networkError());
    await expect(saveFormSnapshot('f1', snap())).rejects.toBeDefined();
    expect(updateForm).toHaveBeenCalledTimes(2);
    expect(useBuilderStore.getState().stale).toBe(false);
    expect(useBuilderStore.getState().contentVersion).toBe(1);
  });
});

describe('versions changed by publish / close', () => {
  it('adopts the version a publish/close produced, so the next autosave is not refused', async () => {
    getFormById.mockResolvedValue({ contentVersion: 5 });
    await syncBuilderVersion('f1');
    expect(useBuilderStore.getState().contentVersion).toBe(5);
    updateForm.mockResolvedValue({ contentVersion: 6 });
    await saveFormSnapshot('f1', snap());
    expect(updateForm.mock.calls[0][1].expectedContentVersion).toBe(5);
  });

  it('does not overwrite its version from the server once a conflict is flagged', async () => {
    useBuilderStore.getState().markStale();
    getFormById.mockResolvedValue({ contentVersion: 7 });
    await syncBuilderVersion('f1');
    expect(useBuilderStore.getState().contentVersion).toBe(1);
  });
});

describe('SaveIndicator conflict state', () => {
  const base = { dirty: true, saving: false, error: false, savedAt: null, onRetry: vi.fn() };

  it('says the form changed, counts the edits at risk, offers Reload, and never says "All changes saved"', () => {
    const onReload = vi.fn();
    render(<SaveIndicator {...base} conflict unsavedCount={3} onReload={onReload} />);
    expect(screen.getAllByText('This form changed in another tab or by someone else. Reload to continue.').length).toBeGreaterThan(0);
    expect(screen.getByText('3 unsaved changes')).toBeInTheDocument();
    expect(screen.queryByText('All changes saved')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalled();
  });

  it('outranks saving and error, and singularises one change', () => {
    render(<SaveIndicator {...base} saving error conflict unsavedCount={1} onReload={vi.fn()} />);
    expect(screen.getByText('1 unsaved change')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});
