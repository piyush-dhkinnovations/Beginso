import { describe, it, expect } from 'vitest';
import { MID_FILL_COPY, UNAVAILABLE_COPY, reasonFromCode } from '@/lib/formUnavailable';

describe('reasonFromCode', () => {
  it('maps the three stable backend codes', () => {
    expect(reasonFromCode('FORM_CLOSED')).toBe('closed');
    expect(reasonFromCode('FORM_CLOSE_DATE_PASSED')).toBe('closeDate');
    expect(reasonFromCode('FORM_RESPONSE_LIMIT_REACHED')).toBe('limit');
  });
  it('treats an unknown code on a 410 as closed, and an unknown code elsewhere as nothing', () => {
    expect(reasonFromCode('SOMETHING_NEW', 410)).toBe('closed');
    expect(reasonFromCode(undefined, 410)).toBe('closed');
    expect(reasonFromCode('SOMETHING_NEW', 500)).toBeUndefined();
    expect(reasonFromCode(undefined)).toBeUndefined();
  });
  it('has distinct copy for every state, and every mid-fill message tells the respondent their answers are kept', () => {
    const titles = Object.values(UNAVAILABLE_COPY).map((c) => c.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const msg of Object.values(MID_FILL_COPY)) expect(msg).toMatch(/answers are still on this page/);
  });
});
