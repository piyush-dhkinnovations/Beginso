import { describe, it, expect } from 'vitest';
import {
  sortForms,
  SERVER_SORT_FIELD,
  formatUpdated,
  createFormHref,
  formHref,
  TAB_STATUS,
  formsQueryEnabled,
  STATUS_LABEL,
} from '@/components/forms/formsListUtils';
import type { Form } from '@/types/form';

const form = (o: Partial<Form>) => ({ _id: 'x', title: 'T', status: 'draft', responseCount: 0, updatedAt: '2026-01-01T00:00:00Z', ...o }) as Form;

const forms = [
  form({ _id: 'a', title: 'Beta', status: 'published', responseCount: 5, updatedAt: '2026-03-01T00:00:00Z' }),
  form({ _id: 'b', title: 'alpha', status: 'closed', responseCount: 20, updatedAt: '2026-01-01T00:00:00Z' }),
  form({ _id: 'c', title: 'Gamma', status: 'draft', responseCount: 1, updatedAt: '2026-02-01T00:00:00Z' }),
];
const ids = (l: Form[]) => l.map((f) => f._id);

describe('sortForms', () => {
  it('sorts by title (locale-aware) both ways', () => {
    expect(ids(sortForms(forms, { key: 'title', dir: 'asc' }))).toEqual(['b', 'a', 'c']);
    expect(ids(sortForms(forms, { key: 'title', dir: 'desc' }))).toEqual(['c', 'a', 'b']);
  });

  it('sorts by status', () => {
    expect(ids(sortForms(forms, { key: 'status', dir: 'asc' }))).toEqual(['b', 'c', 'a']);
  });

  it('sorts by responses numerically', () => {
    expect(ids(sortForms(forms, { key: 'responses', dir: 'desc' }))).toEqual(['b', 'a', 'c']);
    expect(ids(sortForms(forms, { key: 'responses', dir: 'asc' }))).toEqual(['c', 'a', 'b']);
  });

  it('sorts by updated, and unknown keys fall back to updated', () => {
    expect(ids(sortForms(forms, { key: 'updated', dir: 'desc' }))).toEqual(['a', 'c', 'b']);
    expect(ids(sortForms(forms, { key: 'nonsense', dir: 'asc' }))).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate its input', () => {
    const copy = [...forms];
    sortForms(forms, { key: 'title', dir: 'asc' });
    expect(forms).toEqual(copy);
  });
});

describe('SERVER_SORT_FIELD', () => {
  it('maps table keys to server fields; responses is client-only', () => {
    expect(SERVER_SORT_FIELD.title).toBe('title');
    expect(SERVER_SORT_FIELD.status).toBe('status');
    expect(SERVER_SORT_FIELD.updated).toBe('updatedAt');
    expect(SERVER_SORT_FIELD.responses).toBeUndefined();
  });
});

describe('formatUpdated', () => {
  it('formats day-first with a short month and 24-hour time', () => {
    const d = new Date(2026, 8, 26, 12, 30); // local time, September
    expect(formatUpdated(d.toISOString())).toBe('26 Sep 2026, 12:30');
  });

  it('pads the hour and never writes "Sept"', () => {
    const out = formatUpdated(new Date(2026, 8, 5, 9, 5).toISOString());
    expect(out).toBe('5 Sep 2026, 09:05');
  });
});

describe('hrefs', () => {
  it('createFormHref', () => {
    expect(createFormHref({ type: 'personal' })).toBe('/forms/new');
    expect(createFormHref({ type: 'workspace', workspaceId: 'ws 1' })).toBe('/forms/new?ws=ws%201');
  });

  it('formHref only adds ws for workspaces', () => {
    expect(formHref('/forms/1/edit', { type: 'personal' })).toBe('/forms/1/edit');
    expect(formHref('/forms/1/edit', { type: 'workspace', workspaceId: 'w9' })).toBe('/forms/1/edit?ws=w9');
  });
});

describe('tabs', () => {
  it('maps tabs to a status filter', () => {
    expect(TAB_STATUS.recent).toBe('all');
    expect(TAB_STATUS.draft).toBe('draft');
    expect(TAB_STATUS.published).toBe('published');
    expect(TAB_STATUS.closed).toBe('closed');
    expect(TAB_STATUS.archived).toBe('all');
  });

  it('formsQueryEnabled is true only for tabs backed by the list query', () => {
    expect(formsQueryEnabled('draft')).toBe(true);
    expect(formsQueryEnabled('archived')).toBe(true);
    expect(formsQueryEnabled('trash' as never)).toBe(false);
  });

  it('has a label per status', () => {
    expect(STATUS_LABEL).toEqual({ draft: 'Draft', published: 'Published', closed: 'Closed' });
  });
});
