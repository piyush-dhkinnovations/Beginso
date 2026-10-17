/** QA D3-002: a failed save used to say only "Save failed". It now says why. */
import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import { saveErrorDetail } from '@/components/form-builder/useBuilderAutosave';

const http = (status: number, data?: unknown) =>
  new AxiosError('x', 'ERR', undefined, undefined, { status, data, statusText: '', headers: {}, config: {} as never });

describe('saveErrorDetail', () => {
  it('offline or unreachable', () => {
    expect(saveErrorDetail(new AxiosError('Network Error', 'ERR_NETWORK'))).toBe("Can't reach Beginso. Check your connection");
  });

  it('a server error names the status and never leaks the raw body', () => {
    expect(saveErrorDetail(http(500, { message: 'TypeError: x is undefined' }))).toBe('Beginso had a problem saving (error 500)');
  });

  it('a validation message from the server wins', () => {
    expect(saveErrorDetail(http(400, { errors: [{ message: 'Option value cannot be empty' }] }))).toBe('Option value cannot be empty');
    expect(saveErrorDetail(http(422, { message: 'Title is too long' }))).toBe('Title is too long');
  });

  it('known statuses without a message', () => {
    expect(saveErrorDetail(http(403))).toMatch(/no longer have access/);
    expect(saveErrorDetail(http(413))).toMatch(/too large/);
    expect(saveErrorDetail(http(429))).toMatch(/Too many saves/);
  });

  it('anything else is null, and the header then says just "Save failed"', () => {
    expect(saveErrorDetail(new Error('boom'))).toBeNull();
  });
});
