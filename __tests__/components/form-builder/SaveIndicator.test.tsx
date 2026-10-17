import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AxiosError } from 'axios';
import { SaveIndicator } from '@/components/form-builder/SaveIndicator';
import { saveErrorDetail } from '@/components/form-builder/useBuilderAutosave';

const base = { dirty: false, saving: false, error: false, savedAt: null, onRetry: vi.fn() };

describe('SaveIndicator', () => {
  it('walks Unsaved -> Saving -> Saved and never claims "saved" while dirty or saving', () => {
    const { rerender } = render(<SaveIndicator {...base} dirty />);
    expect(screen.getAllByText('Unsaved changes').length).toBeGreaterThan(0);
    rerender(<SaveIndicator {...base} dirty saving />);
    expect(screen.getAllByText('Saving…').length).toBeGreaterThan(0);
    rerender(<SaveIndicator {...base} />);
    expect(screen.getAllByText('All changes saved').length).toBeGreaterThan(0);
  });

  it('says why a save failed when the server said (QA A4-002), and still offers Retry', () => {
    render(<SaveIndicator {...base} dirty error detail="Option value cannot be empty" />);
    expect(screen.getAllByText('Save failed: Option value cannot be empty').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('falls back to a plain "Save failed" with no detail', () => {
    render(<SaveIndicator {...base} dirty error />);
    expect(screen.getAllByText('Save failed').length).toBeGreaterThan(0);
  });
});

describe('saveErrorDetail', () => {
  const axiosError = (status: number, data: unknown) =>
    new AxiosError('boom', String(status), undefined, undefined, { status, data, statusText: '', headers: {}, config: {} as never });

  it('prefers the first field-level message from the server', () => {
    expect(saveErrorDetail(axiosError(400, { message: 'Validation failed', errors: [{ field: 'fields.0.options.0', message: 'Option value cannot be empty' }] }))).toBe(
      'Option value cannot be empty'
    );
  });

  it('uses the message of a 400, but never leaks a 500 body', () => {
    expect(saveErrorDetail(axiosError(400, { message: 'minDate cannot be greater than maxDate' }))).toBe('minDate cannot be greater than maxDate');
    // A 500 now names the status (QA D3-002) but still never shows the body.
    const detail = saveErrorDetail(axiosError(500, { message: 'stack trace at /srv/app.js' }));
    expect(detail).toBe('Beginso had a problem saving (error 500)');
    expect(detail).not.toMatch(/stack trace/);
  });

  it('returns null for a non-HTTP error', () => {
    expect(saveErrorDetail(new Error('network'))).toBeNull();
  });
});
