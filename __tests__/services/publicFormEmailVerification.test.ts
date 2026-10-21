import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { publicFormService } from '@/services/publicForm';

const fetchMock = vi.fn();
const reply = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body, headers: { get: () => 'application/json' } });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('publicFormService: email verification', () => {
  it('asks for the email with the typed address and returns the browser-only id', async () => {
    fetchMock.mockResolvedValue(reply(200, { success: true, verificationId: 'secret-1' }));
    await expect(publicFormService.requestEmailVerification('my-form', 'a@b.co')).resolves.toEqual({ verificationId: 'secret-1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/public\/my-form\/verify-email$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.co' });
  });

  it('throws a message that is safe to show: the backend one, or a clear one for a rate limit', async () => {
    fetchMock.mockResolvedValueOnce(reply(502, { error: { message: 'We could not send the verification email. Please try again.' } }));
    await expect(publicFormService.requestEmailVerification('f', 'a@b.co')).rejects.toThrow('could not send');
    fetchMock.mockResolvedValueOnce(reply(429, {}));
    await expect(publicFormService.requestEmailVerification('f', 'a@b.co')).rejects.toThrow(/Too many emails/);
  });

  it('checks the status with the id in the path, never in the query', async () => {
    fetchMock.mockResolvedValue(reply(200, { success: true, status: 'verified', email: 'a@b.co' }));
    await expect(publicFormService.getEmailVerification('f', 'id/with slash')).resolves.toEqual({ status: 'verified', email: 'a@b.co' });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/verify-email/id%2Fwith%20slash');
  });

  it('confirms a link and maps the answer; a server error is an error, not "invalid"', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { success: true, state: 'verified' }));
    await expect(publicFormService.confirmEmailVerification('t')).resolves.toBe('verified');
    fetchMock.mockResolvedValueOnce(reply(200, { success: false, state: 'expired' }));
    await expect(publicFormService.confirmEmailVerification('t')).resolves.toBe('expired');
    fetchMock.mockResolvedValueOnce(reply(404, { success: false, state: 'invalid' }));
    await expect(publicFormService.confirmEmailVerification('t')).resolves.toBe('invalid');
    fetchMock.mockResolvedValueOnce(reply(500, {}));
    await expect(publicFormService.confirmEmailVerification('t')).rejects.toThrow();
  });

  it('sends the verification id with the submit', async () => {
    fetchMock.mockResolvedValue(reply(200, { success: true }));
    await publicFormService.submitForm('f', { answers: [], respondentEmail: 'a@b.co' }, {}, '', { emailVerificationId: 'secret-1' });
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get('emailVerificationId')).toBe('secret-1');
  });
});
