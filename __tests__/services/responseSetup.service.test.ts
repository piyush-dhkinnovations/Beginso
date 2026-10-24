import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({
  default: { get: vi.fn(), put: vi.fn(), interceptors: { response: { use: vi.fn() } } },
}));

import axiosInstance from '@/lib/axios';
import { responseSetupService } from '@/services/responseSetup';
import { DEFAULT_RESPONSE_SETUP } from '@/types/responseSetup';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;
const mockPut = axiosInstance.put as ReturnType<typeof vi.fn>;

describe('responseSetupService', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPut.mockReset();
  });

  it('reads the setup of one form', async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        version: 4,
        setup: { ...DEFAULT_RESPONSE_SETUP, opensAs: 'board', tableColumns: ['respondent', 'q:f1'] },
        stages: { mode: 'own', list: [{ id: 'a', name: 'Received', colour: 'neutral', category: 'new', order: 0, isDefault: true }], startIndex: 0 },
      },
    });
    const result = await responseSetupService.get('f1');
    expect(mockGet).toHaveBeenCalledWith('/api/forms/f1/response-setup');
    expect(result.version).toBe(4);
    expect(result.setup.opensAs).toBe('board');
    expect(result.setup.tableColumns).toEqual(['respondent', 'q:f1']);
    expect(result.stages).toMatchObject({ mode: 'own', startIndex: 0 });
  });

  it('fills anything the server leaves out with today\'s defaults, so a half-filled answer never breaks the page', async () => {
    mockGet.mockResolvedValue({ data: { success: true } });
    expect(await responseSetupService.get('f1')).toEqual({
      version: 0,
      setup: DEFAULT_RESPONSE_SETUP,
      stages: { mode: 'workspace', list: [], startIndex: null },
    });
    mockGet.mockResolvedValue({ data: { version: 2, setup: { cardTitle: 'f9' }, stages: { mode: 'sideways' } } });
    const partial = await responseSetupService.get('f1');
    expect(partial.setup).toEqual({ ...DEFAULT_RESPONSE_SETUP, cardTitle: 'f9' });
    expect(partial.stages.mode).toBe('workspace');
  });

  it('saves the whole setup in one PUT and returns what the server now holds', async () => {
    mockPut.mockResolvedValue({ data: { success: true, version: 5, setup: DEFAULT_RESPONSE_SETUP, stages: { mode: 'workspace', list: [], startIndex: null } } });
    const input = { ...DEFAULT_RESPONSE_SETUP, version: 4, stages: { mode: 'workspace' as const } };
    const saved = await responseSetupService.save('f1', input);
    expect(mockPut).toHaveBeenCalledWith('/api/forms/f1/response-setup', input);
    expect(saved.version).toBe(5);
  });
});
