import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { publicFormService } from '@/services/publicForm';

const fetchMock = vi.fn();
const reply = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body, headers: { get: () => 'application/json' } });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('publicFormService: email code', () => {
  it('asks for a code with the typed address and returns the browser-only id', async () => {
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
    await expect(publicFormService.requestEmailVerification('f', 'a@b.co')).rejects.toThrow(/Too many codes/);
  });

  it('checks a code with the id in the path and the code in the body, never in the query', async () => {
    fetchMock.mockResolvedValue(reply(200, { success: true, state: 'verified', email: 'a@b.co' }));
    await expect(publicFormService.checkEmailCode('f', 'id/with slash', '123456')).resolves.toEqual({ state: 'verified', email: 'a@b.co' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/verify-email/id%2Fwith%20slash/code');
    expect(JSON.parse(init.body)).toEqual({ code: '123456' });
  });

  it('a wrong code is an answer with the tries left, not an error', async () => {
    fetchMock.mockResolvedValue(reply(422, { success: false, state: 'wrong', attemptsLeft: 3 }));
    await expect(publicFormService.checkEmailCode('f', 'id', '000000')).resolves.toEqual({ state: 'wrong', attemptsLeft: 3 });
  });

  it('maps locked, expired and unknown requests', async () => {
    fetchMock.mockResolvedValueOnce(reply(429, { success: false, state: 'locked' }));
    await expect(publicFormService.checkEmailCode('f', 'id', '000000')).resolves.toEqual({ state: 'locked' });
    fetchMock.mockResolvedValueOnce(reply(410, { success: false, state: 'expired' }));
    await expect(publicFormService.checkEmailCode('f', 'id', '000000')).resolves.toEqual({ state: 'expired' });
    fetchMock.mockResolvedValueOnce(reply(404, { success: false, state: 'invalid' }));
    await expect(publicFormService.checkEmailCode('f', 'id', '000000')).resolves.toEqual({ state: 'invalid' });
  });

  it('a server error is an error (not "invalid"), and a rate limit that is not a lockout says wait', async () => {
    fetchMock.mockResolvedValueOnce(reply(500, {}));
    await expect(publicFormService.checkEmailCode('f', 'id', '000000')).rejects.toThrow(/could not check/);
    fetchMock.mockResolvedValueOnce(reply(429, {}));
    await expect(publicFormService.checkEmailCode('f', 'id', '000000')).rejects.toThrow(/Too many attempts/);
  });

  it('sends the verification id with the submit', async () => {
    fetchMock.mockResolvedValue(reply(200, { success: true }));
    await publicFormService.submitForm('f', { answers: [] }, {}, '', { emailVerificationId: 'secret-1' });
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get('emailVerificationId')).toBe('secret-1');
  });
});
