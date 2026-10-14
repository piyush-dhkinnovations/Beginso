import { describe, it, expect } from 'vitest';
import { formatStorage, storageLevel } from '@/lib/storageUsage';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';

const MB = 1024 * 1024;

describe('storageLevel', () => {
  it('is ok below 80%, warning from 80%, full from 100%', () => {
    expect(storageLevel(399 * MB, 500 * MB)).toBe('ok');
    expect(storageLevel(400 * MB, 500 * MB)).toBe('warning');
    expect(storageLevel(500 * MB, 500 * MB)).toBe('full');
    expect(storageLevel(550 * MB, 500 * MB)).toBe('full');
  });
});

describe('formatStorage', () => {
  it('shows MB, and GB from 1024 MB', () => {
    expect(formatStorage(320 * MB)).toBe('320 MB');
    expect(formatStorage(2048 * MB)).toBe('2.0 GB');
  });
});

describe('quota error codes', () => {
  it('turn into a real sentence', () => {
    const e = (code: string) => ({ response: { status: 403, data: { error: { code, message: 'x' } } } });
    expect(getFriendlyErrorMessage(e('STORAGE_QUOTA_EXCEEDED'))).toMatch(/storage is full/i);
    expect(getFriendlyErrorMessage(e('WORKSPACE_LIMIT_REACHED'))).toMatch(/limit on workspaces/i);
  });
});
