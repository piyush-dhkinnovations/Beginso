import { describe, it, expect } from 'vitest';
import { isTopAnswer, isTopUrl } from '@/lib/responseAnswers';
import type { AnswerItem } from '@/lib/responseAnswers';
import type { FormField } from '@/types/form';

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
