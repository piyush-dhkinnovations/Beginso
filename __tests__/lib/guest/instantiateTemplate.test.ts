import { describe, expect, it } from 'vitest';
import { instantiateTemplate } from '@/lib/guest/instantiateTemplate';

const counter = () => {
  let n = 0;
  return () => `new-${++n}`;
};
const field = (id: string, extra: object = {}) => ({ fieldId: id, label: id, type: 'short_text', required: false, deleted: false, order: 0, pageId: 'p1', ...extra }) as never;

describe('instantiateTemplate', () => {
  it('gives every field and page a fresh id and repoints logic rules at the new ids', () => {
    const t = instantiateTemplate(
      {
        name: 'Survey',
        pages: [{ id: 'p1', order: 0 }],
        fields: [
          field('A'),
          field('B', { logicRules: [{ condition: { fieldId: 'A', operator: 'equals', value: 'yes' }, action: 'show', targetFieldId: 'B' }] }),
        ],
      },
      counter()
    );
    const [a, b] = t.fields;
    expect(a.fieldId).not.toBe('A');
    expect(b.fieldId).not.toBe('B');
    expect(t.pages[0].id).not.toBe('p1');
    expect(a.pageId).toBe(t.pages[0].id);
    const rule = b.logicRules![0];
    expect(rule.condition.fieldId).toBe(a.fieldId); // the rule on B still watches A
    expect(rule.targetFieldId).toBe(b.fieldId);
    expect(t.title).toBe('Survey');
  });

  it('accepts Mongo _id fields and a template with no pages', () => {
    const t = instantiateTemplate(
      { name: 'X', fields: [{ ...(field('x') as object), fieldId: undefined, _id: 'mongo1', pageId: undefined } as never] },
      counter()
    );
    expect(t.pages).toHaveLength(1);
    expect(t.fields[0].pageId).toBe(t.pages[0].id);
    expect(t.fields[0]).not.toHaveProperty('_id');
  });

  it('does not mutate the template it was given', () => {
    const src = { name: 'S', fields: [field('A')], pages: [{ id: 'p1', order: 0 }] };
    const copy = JSON.stringify(src);
    instantiateTemplate(src, counter());
    expect(JSON.stringify(src)).toBe(copy);
  });
});
