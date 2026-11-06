/**
 * Rollout safety: a backend that predates branding.theme saves everything else and silently drops the theme. The frontend notices that the reply has
 * no theme although one was sent, says "Couldn't save your style", keeps the local value, and does not call the save done.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/services/forms', () => ({ formsService: { updateForm: vi.fn() } }));
const toast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

import { formsService } from '@/services/forms';
import { useBuilderStore } from '@/store/builderStore';
import { useBuilderAutosave, saveFormSnapshot, themeWasDropped, ThemeNotSavedError, saveErrorDetail, STYLE_NOT_SAVED } from '@/components/form-builder/useBuilderAutosave';
import type { Form, FormTheme } from '@/types/form';

const updateForm = formsService.updateForm as ReturnType<typeof vi.fn>;
const THEME: FormTheme = { v: 1, card: { radius: 12 } };
const form = (): Form => ({ _id: 'form-1', workspaceId: null, title: 'My form', description: '', status: 'draft', fields: [], pages: [{ id: 'p1', order: 0, title: 'My form' }], branding: {}, settings: { honeypotEnabled: true }, responseCount: 0, createdAt: '', updatedAt: '' }) as unknown as Form;
const snap = (branding = {}) => ({ fields: [], formTitle: 'My form', pages: [{ id: 'p1', order: 0, title: 'My form' }], branding, settings: { honeypotEnabled: true } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  useBuilderStore.getState().initForm(form());
});
afterEach(() => vi.restoreAllMocks());

describe('themeWasDropped', () => {
  it('is true only when a theme was sent and the reply has a branding object without one', () => {
    expect(themeWasDropped({ theme: THEME }, { branding: {} })).toBe(true);
    expect(themeWasDropped({ theme: THEME }, { branding: { theme: THEME } })).toBe(false);
    expect(themeWasDropped({ theme: THEME }, { branding: { theme: { v: 2 } as unknown as FormTheme } })).toBe(true);
  });

  it('is false when nothing was sent, when it was cleared, or when the reply says nothing about branding', () => {
    expect(themeWasDropped({}, { branding: {} })).toBe(false);
    expect(themeWasDropped({ theme: null }, { branding: {} })).toBe(false);
    expect(themeWasDropped({ theme: { v: 1 } }, { branding: {} })).toBe(false);
    expect(themeWasDropped({ theme: THEME }, {})).toBe(false);
    expect(themeWasDropped({ theme: THEME }, undefined)).toBe(false);
  });
});

describe('saving', () => {
  it('fails with "Couldn\'t save your style" when the reply has no theme', async () => {
    updateForm.mockResolvedValue({ branding: {} });
    const err = await saveFormSnapshot('form-1', snap({ theme: THEME })).catch((e) => e);
    expect(err).toBeInstanceOf(ThemeNotSavedError);
    expect(saveErrorDetail(err)).toBe(STYLE_NOT_SAVED);
    expect(STYLE_NOT_SAVED).toBe("Couldn't save your style");
  });

  it('succeeds when the reply carries the theme, and when none was sent', async () => {
    updateForm.mockResolvedValue({ branding: { theme: THEME } });
    await expect(saveFormSnapshot('form-1', snap({ theme: THEME }))).resolves.toBeDefined();
    updateForm.mockResolvedValue({ branding: {} });
    await expect(saveFormSnapshot('form-1', snap({}))).resolves.toBeDefined();
  });

  it('autosave tells the person, keeps the local style, and leaves the form unsaved', async () => {
    vi.useFakeTimers();
    updateForm.mockResolvedValue({ branding: {} });
    renderHook(() => useBuilderAutosave());
    act(() => useBuilderStore.getState().setBranding({ theme: THEME }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    expect(toast).toHaveBeenCalledWith(STYLE_NOT_SAVED, 'error');
    expect(useBuilderStore.getState().branding.theme).toEqual(THEME);
    expect(useBuilderStore.getState().dirty).toBe(true);
    vi.useRealTimers();
  });
});
