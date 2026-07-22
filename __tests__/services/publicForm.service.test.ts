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

    it('returns a null schema and no adminNote on a bodyless 404', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: () => Promise.reject(new Error('not json')),
      });

      const result = await publicFormService.getFormSchema('missing-slug');
      expect(result).toEqual({ schema: null, adminNote: undefined });
    });

    it('extracts settings.successMessage as adminNote when the 404 body includes one', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: () => Promise.resolve({ settings: { successMessage: 'This survey closed on Friday.' } }),
      });

      const result = await publicFormService.getFormSchema('closed-slug');
      expect(result).toEqual({ schema: null, adminNote: 'This survey closed on Friday.' });
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
      answers: [{ fieldId: 'f1', pageId: 'page-1', value: 'hello' }],
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
});
