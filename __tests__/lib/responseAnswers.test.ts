import { describe, it, expect } from 'vitest';
import { buildAnswerItems, isTopAnswer, isTopUrl } from '@/lib/responseAnswers';
import type { AnswerItem } from '@/lib/responseAnswers';
import type { FormField } from '@/types/form';
import type { IResponseFile } from '@/types/response';

const item = (field: Record<string, unknown>, value: unknown, files: unknown[] = []) =>
  ({ key: 'k', number: 1, label: 'L', field: field as unknown as FormField, value, files }) as unknown as AnswerItem;

describe('answers shown at the top of a response', () => {
  it('a link set to Top of response is pulled up; the default (inline) is not', () => {
    expect(isTopUrl(item({ type: 'url', urlPreviewPosition: 'top' }, 'https://example.com'))).toBe(true);
    expect(isTopUrl(item({ type: 'url' }, 'https://example.com'))).toBe(false);
    expect(isTopUrl(item({ type: 'url', urlPreviewPosition: 'inline' }, 'https://example.com'))).toBe(false);
  });

  it('an empty or non-web answer stays where it is, so no empty card is lifted to the top', () => {
    expect(isTopUrl(item({ type: 'url', urlPreviewPosition: 'top' }, ''))).toBe(false);
    expect(isTopUrl(item({ type: 'url', urlPreviewPosition: 'top' }, 'javascript:alert(1)'))).toBe(false);
  });

  it('images at the top still count, other fields never do', () => {
    expect(isTopAnswer(item({ type: 'image_upload', previewPosition: 'top' }, null, [{ url: 'u' }]))).toBe(true);
    expect(isTopAnswer(item({ type: 'short_text', urlPreviewPosition: 'top' }, 'https://example.com'))).toBe(false);
  });
});

describe('answers given before a question changed type', () => {
  const field = (type: string, label = 'Q', order = 0) => ({ fieldId: label, pageId: 'p', type, label, order, required: false, deleted: false }) as unknown as FormField;
  const file = (id: string, name: string) => ({ id, name, url: `/api/upload/file/u/f/r/${name}` }) as unknown as IResponseFile;

  // The server stores a file answer as an object, which the declared answer type does not list.
  const record = { fileName: '/api/upload/file/u/f/r/cv.pdf' } as unknown as string;

  it('text stays visible when the question is now an upload, and takes no other question\'s file', () => {
    const fields = [field('file_upload', 'Was text', 0), field('file_upload', 'CV', 1)];
    const items = buildAnswerItems({ 'Was text': 'hello', CV: record }, [file('1', 'cv.pdf')], fields);
    expect(items[0]).toMatchObject({ value: 'hello', files: [] });
    expect(items[0].field).toBeUndefined();
    expect(items[1].files.map((f) => f.id)).toEqual(['1']);
  });

  it('a chosen list stays visible when the question is now an image upload', () => {
    const [item] = buildAnswerItems({ Q: ['A', 'B'] }, [], [field('image_upload')]);
    expect(item.value).toEqual(['A', 'B']);
    expect(item.field).toBeUndefined();
  });

  it('files stay under their question when it is no longer an upload', () => {
    const fields = [field('short_text', 'Doc', 0), field('long_text', 'Photo', 1)];
    const items = buildAnswerItems({ Doc: record, Photo: ['a.png'] }, [file('1', 'cv.pdf'), file('2', 'a.png')], fields);
    expect(items.map((i) => [i.field, i.files.map((f) => f.id)])).toEqual([[undefined, ['1']], [undefined, ['2']]]);
    expect(items).toHaveLength(2);
  });
});
