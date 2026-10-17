import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/services/reports', () => ({ reportsService: { createReport: vi.fn() } }));
const toast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

import { reportsService } from '@/services/reports';
import { useInboxExports } from '@/components/responses/useInboxExports';

const createReport = reportsService.createReport as ReturnType<typeof vi.fn>;
const filters = { stageId: 's1', unread: true } as Parameters<typeof useInboxExports>[0]['filters'];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useInboxExports', () => {
  it('exports a selection by ids as csv and toasts success', async () => {
    createReport.mockResolvedValue({});
    const { result } = renderHook(() => useInboxExports({ formId: 'f1', filters }));
    result.current.runExport({ ids: ['r1', 'r2'] });
    expect(createReport).toHaveBeenCalledWith({ format: 'csv', ids: ['r1', 'r2'] }, 'personal');
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Export started. Find it under Exports when it finishes.', 'success'));
  });

  it('exports "all matching" using the target filter and form', async () => {
    createReport.mockResolvedValue({});
    const { result } = renderHook(() => useInboxExports({ formId: 'f1', filters }));
    result.current.runExport({ filter: { unread: true }, formId: 'f9' });
    expect(createReport).toHaveBeenCalledWith({ format: 'csv', formId: 'f9', filters: { unread: true } }, 'personal');
  });

  it('exports the current filter with the hook formId', async () => {
    createReport.mockResolvedValue({});
    const { result } = renderHook(() => useInboxExports({ formId: 'f1', filters }));
    result.current.exportCurrentFilter();
    expect(createReport).toHaveBeenCalledWith({ format: 'csv', formId: 'f1', filters }, 'personal');
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringMatching(/export started/i), 'success'));
  });

  it('works without a formId (all forms)', () => {
    createReport.mockResolvedValue({});
    const { result } = renderHook(() => useInboxExports({ filters }));
    result.current.exportCurrentFilter();
    expect(createReport).toHaveBeenCalledWith({ format: 'csv', formId: undefined, filters }, 'personal');
  });

  // QA D5-002: exporting from a workspace form's responses went out under the personal scope: "Form not found".
  it('sends the workspace scope with the request, for a selection and for the current filter', () => {
    createReport.mockResolvedValue({});
    const { result } = renderHook(() => useInboxExports({ formId: 'f1', filters, scope: 'acme' }));
    result.current.runExport({ ids: ['r1'] });
    result.current.exportCurrentFilter();
    expect(createReport).toHaveBeenNthCalledWith(1, { format: 'csv', ids: ['r1'] }, 'acme');
    expect(createReport).toHaveBeenNthCalledWith(2, { format: 'csv', formId: 'f1', filters }, 'acme');
  });

  it('toasts an error and no success when the request fails', async () => {
    createReport.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useInboxExports({ formId: 'f1', filters }));
    result.current.exportCurrentFilter();
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.any(String), 'error'));
    expect(toast).not.toHaveBeenCalledWith(expect.anything(), 'success');
  });

  it('toasts a single error message for a 403 (the service no longer rewrites it)', async () => {
    createReport.mockRejectedValue(Object.assign(new Error('403'), { response: { status: 403, data: { message: 'Nope' } } }));
    const { result } = renderHook(() => useInboxExports({ formId: 'f1', filters }));
    result.current.exportCurrentFilter();
    await waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
    expect(toast.mock.calls[0][1]).toBe('error');
    expect(typeof toast.mock.calls[0][0]).toBe('string');
  });
});
