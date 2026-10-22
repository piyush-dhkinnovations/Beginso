import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnswerValue } from '@/components/responses/answers/AnswerValue';
import type { AnswerItem } from '@/lib/responseAnswers';
import type { FormField } from '@/types/form';
import type { IResponseFile } from '@/types/response';

const fileProps = vi.fn();
const imageProps = vi.fn();
const urlProps = vi.fn();
vi.mock('@/components/responses/answers/FileAnswer', () => ({
  FileAnswer: (p: { file: IResponseFile; compact?: boolean }) => {
    fileProps(p);
    return <div data-testid="file">{p.file.name}</div>;
  },
}));
vi.mock('@/components/responses/answers/ImageAnswer', () => ({
  ImageAnswer: (p: { files: IResponseFile[]; compact?: boolean }) => {
    imageProps(p);
    return <div data-testid="image">{p.files.length}</div>;
  },
}));
vi.mock('@/components/responses/answers/UrlAnswer', () => ({
  UrlAnswer: (p: { value: string; small?: boolean }) => {
    urlProps(p);
    return <a href={p.value}>{p.value}</a>;
  },
}));

const field = (o: Record<string, unknown>) => o as unknown as FormField;
const file = (id: string): IResponseFile => ({ id, name: `${id}.pdf`, size: 1, type: 'application/pdf', url: `/${id}.pdf`, uploadTime: '2026-01-01' });
const item = (o: Partial<AnswerItem>): AnswerItem => ({ key: 'k', number: 1, label: 'Q', value: '', files: [], ...o });
const draw = (i: AnswerItem, variant: 'full' | 'compact' = 'full', query = '') =>
  render(<AnswerValue item={i} responseId="r1" scope="acme" variant={variant} query={query} />);

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const TYPES: [type: string, value: AnswerItem['value'], visible: string | RegExp][] = [
  ['short_text', 'Night Train', 'Night Train'],
  ['long_text', 'A longer answer', 'A longer answer'],
  ['email', 'asha.rao@example.com', 'asha.rao@example.com'],
  ['phone', '9800000001', '9800000001'],
  ['number', '2026', '2026'],
  ['date', '2026-09-25', '25 Sep 2026'],
  ['time', '14:30', '2:30 PM'],
  ['datetime', '2026-09-25T10:30', '25 Sep 2026, 10:30 AM'],
  ['dropdown', 'Drama', 'Drama'],
  ['multiple_choice', ['Red', 'Blue'], 'Blue'],
  ['checkbox', ['A'], 'A'],
  ['rating', 4 as never, '4 / 5'],
  ['currency', 1500 as never, /1,500/],
  ['address', '1 Main St\nPune', 'Pune'],
  ['signature', 'Asha R', 'Asha R'],
  ['hologram', 'unknown type falls back to text', 'unknown type falls back to text'],
];

describe('AnswerValue renders every question type in both variants', () => {
  it.each(TYPES)('%s', (type, value, visible) => {
    for (const variant of ['full', 'compact'] as const) {
      const { unmount } = draw(item({ field: field({ type }), value }), variant);
      expect(screen.getAllByText(visible).length).toBeGreaterThan(0);
      unmount();
    }
  });

  it('a drawn signature is an image in both variants, smaller in compact', () => {
    const full = draw(item({ field: field({ type: 'signature' }), value: PNG }), 'full');
    const fullClass = screen.getByRole('img', { name: 'Drawn signature' }).className;
    full.unmount();
    draw(item({ field: field({ type: 'signature' }), value: PNG }), 'compact');
    expect(screen.getByRole('img', { name: 'Drawn signature' }).className).not.toBe(fullClass);
  });

  it('shows a dash for an empty answer in both variants', () => {
    for (const variant of ['full', 'compact'] as const) {
      const { unmount } = draw(item({ field: field({ type: 'short_text' }), value: '' }), variant);
      expect(screen.getByText('—')).toBeInTheDocument();
      unmount();
    }
  });
});

describe('links people can act on', () => {
  it('an email is a mailto: link', () => {
    draw(item({ field: field({ type: 'email' }), value: 'asha.rao@example.com' }));
    expect(screen.getByRole('link')).toHaveAttribute('href', 'mailto:asha.rao@example.com');
  });

  it('something that is not an email stays plain text', () => {
    draw(item({ field: field({ type: 'email' }), value: 'javascript:alert(1)' }));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
  });

  it('a phone number is a tel: link with only digits and +, and a too-short one is text', () => {
    const { unmount } = draw(item({ field: field({ type: 'phone' }), value: '+91 98000 00001' }));
    expect(screen.getByRole('link')).toHaveAttribute('href', 'tel:+919800000001');
    unmount();
    draw(item({ field: field({ type: 'phone' }), value: '12' }));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('passes the variant to links so the Table can show a small card', () => {
    urlProps.mockClear();
    draw(item({ field: field({ type: 'url' }), value: 'https://a.example/x' }), 'compact');
    expect(urlProps).toHaveBeenCalledWith(expect.objectContaining({ small: true }));
    urlProps.mockClear();
    draw(item({ field: field({ type: 'url' }), value: 'https://a.example/x' }), 'full');
    expect(urlProps).toHaveBeenCalledWith(expect.objectContaining({ small: false }));
  });
});

describe('text is always text', () => {
  const hostile = '<img src=x onerror="alert(1)"><script>window.__pwned = 1</script><b>bold</b>';

  it.each(['short_text', 'long_text', 'email', 'phone', 'dropdown', 'hologram'])('%s: HTML-looking text is shown, never parsed', (type) => {
    const { container } = draw(item({ field: field({ type }), value: hostile }), 'full', 'bold');
    expect(container.querySelector('img, script, b')).toBeNull();
    expect(container.textContent).toContain('<script>window.__pwned = 1</script>');
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  });

  it('a list of choices is chips of text', () => {
    const { container } = draw(item({ field: field({ type: 'checkbox' }), value: ['<b>x</b>', 'y'] }));
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText('<b>x</b>')).toBeInTheDocument();
  });
});

describe('long answers', () => {
  const long = Array.from({ length: 30 }, (_, i) => `line ${i}`).join('\n');

  it('are clamped with "Show more", and can be expanded and collapsed', async () => {
    const { container } = draw(item({ field: field({ type: 'long_text' }), value: long }));
    const more = screen.getByRole('button', { name: /Show more/ });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(container.querySelector('[data-clamped="true"]')).toHaveClass('line-clamp-8');
    await userEvent.click(more);
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
    expect(container.querySelector('[data-clamped="false"]')).not.toHaveClass('line-clamp-8');
    // nothing was cut from the DOM: the whole answer is there either way
    expect(container.textContent).toContain('line 29');
  });

  it('a 5,000-character answer is clamped and wraps instead of overflowing', () => {
    const { container } = draw(item({ field: field({ type: 'long_text' }), value: 'x'.repeat(5000) }));
    expect(screen.getByRole('button', { name: /Show more/ })).toBeInTheDocument();
    expect(container.textContent).toContain('x'.repeat(5000));
  });

  it('short text has no button', () => {
    draw(item({ field: field({ type: 'long_text' }), value: 'short' }));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('search highlight', () => {
  it('marks matches in text, case-insensitively', () => {
    const { container } = draw(item({ field: field({ type: 'short_text' }), value: 'Night Train' }), 'full', 'TRAIN');
    expect(container.querySelector('mark')?.textContent).toBe('Train');
  });

  it('marks matches inside email links and choice chips too', () => {
    const { container, unmount } = draw(item({ field: field({ type: 'email' }), value: 'asha@example.com' }), 'full', 'asha');
    expect(container.querySelector('a mark')?.textContent).toBe('asha');
    unmount();
    const chips = draw(item({ field: field({ type: 'checkbox' }), value: ['Red', 'Blue'] }), 'full', 'blu');
    expect(chips.container.querySelector('mark')?.textContent).toBe('Blu');
  });
});

describe('files and images', () => {
  it('a file answer renders one FileAnswer per file, compact in the Table', () => {
    fileProps.mockClear();
    draw(item({ field: field({ type: 'file_upload' }), files: Array.from({ length: 20 }, (_, i) => file(`f${i}`)) }), 'compact');
    expect(screen.getAllByTestId('file')).toHaveLength(20);
    expect(fileProps).toHaveBeenCalledWith(expect.objectContaining({ compact: true }));
  });

  it('full variant keeps the file card', () => {
    fileProps.mockClear();
    draw(item({ field: field({ type: 'file_upload' }), files: [file('a')] }), 'full');
    expect(fileProps).toHaveBeenCalledWith(expect.objectContaining({ compact: false }));
  });

  it('images pass the compact flag; no files is a dash', () => {
    imageProps.mockClear();
    const { unmount } = draw(item({ field: field({ type: 'image_upload' }), files: [file('a')] }), 'compact');
    expect(imageProps).toHaveBeenCalledWith(expect.objectContaining({ compact: true }));
    unmount();
    draw(item({ field: field({ type: 'image_upload' }), files: [] }));
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('a file whose question was removed is still shown', () => {
    draw(item({ field: undefined, files: [file('z')] }));
    expect(screen.getByTestId('file')).toHaveTextContent('z.pdf');
  });
});
