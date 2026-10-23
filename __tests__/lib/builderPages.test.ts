import { describe, it, expect } from 'vitest';
import { repairPageRefs } from '@/lib/builderPages';
import type { FormField, FormPage } from '@/types/form';

const page = (id: string, order: number): FormPage => ({ id, order, title: id });
const field = (fieldId: string, pageId: string | undefined, deleted = false): FormField =>
  ({ fieldId, pageId, label: fieldId, type: 'short_text', required: false, deleted, order: 0 }) as FormField;

describe('repairPageRefs', () => {
  const pages = [page('p2', 1), page('p1', 0)];

  it('returns the very same array when every field points at a page that exists', () => {
    const fields = [field('a', 'p1'), field('b', 'p2')];
    expect(repairPageRefs(fields, pages)).toBe(fields);
  });

  it('moves a field whose page is gone to the first page by order, not by position in the array', () => {
    const out = repairPageRefs([field('a', 'p2'), field('b', 'gone')], pages);
    expect(out.map((f) => f.pageId)).toEqual(['p2', 'p1']);
  });

  it('repairs soft-deleted fields too: they are still sent, so the server still checks them', () => {
    const out = repairPageRefs([field('a', 'gone', true)], pages);
    expect(out[0].pageId).toBe('p1');
    expect(out[0].deleted).toBe(true);
  });

  it('gives a field with no page the first page', () => {
    expect(repairPageRefs([field('a', undefined)], pages)[0].pageId).toBe('p1');
  });

  it('does not change the fields it leaves alone, and does nothing without pages', () => {
    const keep = field('a', 'p1');
    const out = repairPageRefs([keep, field('b', 'gone')], pages);
    expect(out[0]).toBe(keep);
    const none = [field('a', 'x')];
    expect(repairPageRefs(none, [])).toBe(none);
  });
});
