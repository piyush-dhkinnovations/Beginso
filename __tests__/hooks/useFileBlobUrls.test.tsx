import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/services/responses', () => ({ responsesService: { getFileBlobUrl: vi.fn() } }));

import { responsesService } from '@/services/responses';
import { useFileBlobUrls } from '@/hooks/useFileBlobUrls';

const getBlob = responsesService.getFileBlobUrl as ReturnType<typeof vi.fn>;
const revoke = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('URL', Object.assign(URL, { revokeObjectURL: revoke }));
});

describe('useFileBlobUrls', () => {
  it('starts empty and does nothing for no files', () => {
    const { result } = renderHook(() => useFileBlobUrls('r1', []));
    expect(result.current).toEqual({});
    expect(getBlob).not.toHaveBeenCalled();
  });

  it('loads each file and exposes ready blob urls keyed by file id', async () => {
    getBlob.mockImplementation(async (_r: string, id: string) => `blob:${id}`);
    const { result } = renderHook(() => useFileBlobUrls('r1', ['f1', 'f2']));
    await waitFor(() => expect(result.current).toEqual({ f1: { status: 'ready', url: 'blob:f1' }, f2: { status: 'ready', url: 'blob:f2' } }));
    expect(getBlob).toHaveBeenCalledWith('r1', 'f1');
    expect(getBlob).toHaveBeenCalledWith('r1', 'f2');
  });

  it('marks a failed file as error without affecting the others', async () => {
    getBlob.mockImplementation(async (_r: string, id: string) => {
      if (id === 'bad') throw new Error('x');
      return `blob:${id}`;
    });
    const { result } = renderHook(() => useFileBlobUrls('r1', ['ok', 'bad']));
    await waitFor(() => expect(result.current.bad).toEqual({ status: 'error' }));
    expect(result.current.ok).toEqual({ status: 'ready', url: 'blob:ok' });
  });

  it('revokes created urls on unmount', async () => {
    getBlob.mockResolvedValue('blob:one');
    const { result, unmount } = renderHook(() => useFileBlobUrls('r1', ['f1']));
    await waitFor(() => expect(result.current.f1?.status).toBe('ready'));
    unmount();
    expect(revoke).toHaveBeenCalledWith('blob:one');
  });

  it('revokes a url that arrives after unmount', async () => {
    let resolve!: (u: string) => void;
    getBlob.mockReturnValue(new Promise<string>((r) => (resolve = r)));
    const { unmount } = renderHook(() => useFileBlobUrls('r1', ['f1']));
    unmount();
    resolve('blob:late');
    await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:late'));
  });

  it('reloads and revokes the old urls when the file list changes', async () => {
    getBlob.mockImplementation(async (_r: string, id: string) => `blob:${id}`);
    const { result, rerender } = renderHook(({ ids }) => useFileBlobUrls('r1', ids), { initialProps: { ids: ['a'] } });
    await waitFor(() => expect(result.current.a?.status).toBe('ready'));
    rerender({ ids: ['b'] });
    expect(revoke).toHaveBeenCalledWith('blob:a');
    await waitFor(() => expect(result.current.b?.status).toBe('ready'));
    expect(result.current.a).toBeUndefined();
  });

  it('does not refetch when re-rendered with an equal list', async () => {
    getBlob.mockResolvedValue('blob:a');
    const { result, rerender } = renderHook(({ ids }) => useFileBlobUrls('r1', ids), { initialProps: { ids: ['a'] } });
    await waitFor(() => expect(result.current.a?.status).toBe('ready'));
    rerender({ ids: ['a'] });
    expect(getBlob).toHaveBeenCalledTimes(1);
  });
});
