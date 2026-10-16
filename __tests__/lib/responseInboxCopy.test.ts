import { describe, it, expect } from 'vitest';
import { describeBulkFailures } from '@/lib/bulkActions';
import { DELETE_COPY, DOWNLOAD_QUEUED, RETENTION_DAYS, SUBMISSION_NOT_FOUND } from '@/lib/responseCopy';
import { ORIGIN_TOOLTIP } from '@/components/responses/WorkflowSidebar';
import { detectRespondentIdentity } from '@/lib/formatters';

describe('describeBulkFailures', () => {
  it('is empty when the server gave no reason, so the toast does not grow a stray full stop', () => {
    expect(describeBulkFailures([])).toBe('');
    expect(describeBulkFailures([{ reason: '' }, {}])).toBe('');
  });
  it('shows one reason as a sentence', () => {
    expect(describeBulkFailures([{ reason: 'Forbidden.' }, { reason: 'Forbidden.' }])).toBe(' Forbidden.');
  });
  it('leads with the most common reason and counts the rest', () => {
    expect(describeBulkFailures([{ reason: 'A' }, { reason: 'B' }, { reason: 'B' }, { reason: 'C' }])).toBe(' B, and 2 other reasons.');
    expect(describeBulkFailures([{ reason: 'A' }, { reason: 'B' }, { reason: 'B' }])).toBe(' B, and 1 other reason.');
  });
});

describe('response inbox copy matches what the system really does (QA A6-005, A6-008, A6-009, A6-012)', () => {
  it('deleting says Trash and 30 days, never "permanent" or "cannot be undone"', () => {
    for (const text of [DELETE_COPY.single, DELETE_COPY.bulk]) {
      expect(text).toMatch(/Trash/);
      expect(text).toContain(`${RETENTION_DAYS} days`);
      expect(text).not.toMatch(/permanent|cannot be undone/i);
    }
    expect(DELETE_COPY.bulk).toMatch(/undo/i);
  });
  it('the download toast names the Exports page (it still said "Reports")', () => {
    expect(DOWNLOAD_QUEUED).toMatch(/Exports/);
    expect(DOWNLOAD_QUEUED).not.toMatch(/Reports/);
  });
  it('the missing-submission message covers both reasons it can be missing, without picking one', () => {
    expect(SUBMISSION_NOT_FOUND.hint).toMatch(/removed/);
    expect(SUBMISSION_NOT_FOUND.hint).toMatch(/different account/);
  });
  it('the Origin tooltip says what the ID is for', () => {
    expect(ORIGIN_TOOLTIP).toMatch(/same network/);
    expect(ORIGIN_TOOLTIP).toMatch(/never stored/);
  });
});

describe('detectRespondentIdentity uses the email the server recorded (QA A6-007)', () => {
  it('shows the account email for a signed-in-only form that has no name or email field', () => {
    const id = detectRespondentIdentity({ q1: 'Great product' }, [], 'member@example.com');
    expect(id).toEqual({ label: undefined, email: 'member@example.com' });
  });
  it('wins over an address guessed from the answers', () => {
    expect(detectRespondentIdentity({ q1: 'other@example.com' }, [], 'real@example.com').email).toBe('real@example.com');
  });
  it('is ignored when blank, so the old behaviour is unchanged', () => {
    expect(detectRespondentIdentity({ q1: 'a@b.co' }, [], '  ').email).toBe('a@b.co');
    expect(detectRespondentIdentity({ q1: 'a@b.co' }, [], null).email).toBe('a@b.co');
  });
});
