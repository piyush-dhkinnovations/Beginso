/**
 * Feature: sprint-3-public-form
 * Tests: publicFormService — getFormSchema, submitForm
 * Requirements: 1.1, 1.3, 1.4, 6.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publicFormService } from '@/services/publicForm';
import type { PublicFormSchema, SubmissionData } from '@/types/publicForm';

const mockSchema: PublicFormSchema = {
  title: 'Test Form',
  pages: [{ id: 'page-1', order: 0 }],
  fields: [],
  branding: {},
  settings: { honeypotEnabled: true },
};

describe('publicFormService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('getFormSchema()', () => {
    it('returns the parsed schema on 200', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      const result = await publicFormService.getFormSchema('abc123');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/public/abc123'),
        expect.objectContaining({ cache: 'no-store' })
      );
      expect(result).toEqual({ schema: mockSchema });
    });

    it('returns a null schema and no userNote on a bodyless 404', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: () => Promise.reject(new Error('not json')),
      });

      const result = await publicFormService.getFormSchema('missing-slug');
      expect(result).toEqual({ schema: null, userNote: undefined });
    });

    it('extracts settings.successMessage as userNote when the 404 body includes one', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: () => Promise.resolve({ settings: { successMessage: 'This survey closed on Friday.' } }),
      });

      const result = await publicFormService.getFormSchema('closed-slug');
      expect(result).toEqual({ schema: null, userNote: 'This survey closed on Friday.' });
    });

    it('throws on a 500 response', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 500,
        ok: false,
      });

      await expect(publicFormService.getFormSchema('abc123')).rejects.toThrow('500');
    });

    it('propagates network errors', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      await expect(publicFormService.getFormSchema('abc123')).rejects.toThrow('Network error');
    });
  });

  describe('submitForm()', () => {
    const submissionData: SubmissionData = {
      answers: [{ fieldId: 'f1', fieldType: 'short_text', fieldLabel: 'Full Name', value: 'hello' }],
    };

    it('builds FormData with a data field, honeypot, and file parts', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, status: 200 });

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      await publicFormService.submitForm('abc123', submissionData, { 'f-file': file });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/public/abc123/submit'),
        expect.objectContaining({ method: 'POST' })
      );

      const sentBody = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as FormData;
      expect(sentBody).toBeInstanceOf(FormData);
      expect(JSON.parse(sentBody.get('data') as string)).toEqual(submissionData);
      expect(sentBody.get('_hp')).toBe('');
      expect(sentBody.get('f-file')).toBe(file);
    });

    it('passes a non-empty honeypot value through instead of hardcoding it empty', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, status: 200 });

      await publicFormService.submitForm('abc123', submissionData, {}, 'a-bot-filled-this-in');

      const sentBody = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as FormData;
      expect(sentBody.get('_hp')).toBe('a-bot-filled-this-in');
    });

    it('returns ok:true on 200', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await publicFormService.submitForm('abc123', submissionData, {});
      expect(result).toEqual({ ok: true, status: 200, message: undefined });
    });

    it('returns the backend error message on 422', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ error: { message: 'Email is required' } }),
      });

      const result = await publicFormService.submitForm('abc123', submissionData, {});
      expect(result).toEqual({ ok: false, status: 422, message: 'Email is required' });
    });

    it('returns ok:false with no message when the error body is not JSON', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not json')),
      });

      const result = await publicFormService.submitForm('abc123', submissionData, {});
      expect(result).toEqual({ ok: false, status: 500, message: undefined });
    });
  });

  describe('unavailable reasons and unconfirmed responses (QA A5-001, A5-004)', () => {
    const mockFetch = (res: Record<string, unknown>) => (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(res);

    it.each([
      ['FORM_CLOSED', 'closed'],
      ['FORM_CLOSE_DATE_PASSED', 'closeDate'],
      ['FORM_RESPONSE_LIMIT_REACHED', 'limit'],
    ])('a 410 with %s resolves to the %s reason, with no schema', async (code, reason) => {
      mockFetch({ status: 410, ok: false, json: () => Promise.resolve({ error: { code } }) });
      expect(await publicFormService.getFormSchema('abc')).toEqual({ schema: null, unavailable: reason });
    });

    it('a 410 with an unknown or missing code still means closed', async () => {
      mockFetch({ status: 410, ok: false, json: () => Promise.reject(new Error('no body')) });
      expect(await publicFormService.getFormSchema('abc')).toEqual({ schema: null, unavailable: 'closed' });
    });

    it('a 404 carries no reason: draft, archived and unknown links stay indistinguishable', async () => {
      mockFetch({ status: 404, ok: false, json: () => Promise.reject(new Error('no body')) });
      const r = await publicFormService.getFormSchema('abc');
      expect(r.schema).toBeNull();
      expect(r.unavailable).toBeUndefined();
    });

    const submit = () => publicFormService.submitForm('abc', { answers: [] } as unknown as SubmissionData, {});

    it('a submit to a form that closed answers with its reason code', async () => {
      mockFetch({ status: 410, ok: false, json: () => Promise.resolve({ message: 'closed', error: { code: 'FORM_CLOSED', message: 'closed' } }) });
      expect(await submit()).toMatchObject({ ok: false, status: 410, code: 'FORM_CLOSED' });
    });

    it('passes the server field errors through, naming each field by label', async () => {
      mockFetch({
        status: 422,
        ok: false,
        json: () => Promise.resolve({ message: 'Validation failed', errors: [{ field: 'Phone', message: 'Field "Phone" is bad.' }, { nope: 1 }] }),
      });
      expect((await submit()).fieldErrors).toEqual([{ field: 'Phone', message: 'Field "Phone" is bad.' }]);
    });

    it('a 200 that is an HTML page is not treated as a stored response', async () => {
      mockFetch({ status: 200, ok: true, headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }), json: () => Promise.reject(new Error('html')) });
      expect(await submit()).toEqual({ ok: false, status: 200, code: 'UNCONFIRMED' });
    });

    it('a normal JSON 200 is still success', async () => {
      mockFetch({ status: 200, ok: true, headers: new Headers({ 'content-type': 'application/json' }), json: () => Promise.resolve({ success: true }) });
      expect(await submit()).toMatchObject({ ok: true, status: 200 });
    });
  });
});
