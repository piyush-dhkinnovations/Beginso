import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnswerCard, isWideAnswer } from '@/components/responses/answers/AnswerCard';
import type { AnswerItem } from '@/lib/responseAnswers';
import type { FormField } from '@/types/form';
import type { IResponseFile } from '@/types/response';

vi.mock('@/components/responses/answers/FileAnswer', () => ({
  FileAnswer: ({ file }: { file: IResponseFile }) => <div data-testid="file-answer">{file.name}</div>,
}));
vi.mock('@/components/responses/answers/ImageAnswer', () => ({
  ImageAnswer: ({ files }: { files: IResponseFile[] }) => <div data-testid="image-answer">{files.length} images</div>,
}));
vi.mock('@/components/responses/answers/UrlAnswer', () => ({
  UrlAnswer: ({ value, scope }: { value: string; scope: string }) => <div data-testid="url-answer">{value}|{scope}</div>,
}));

const field = (o: Record<string, unknown>) => o as unknown as FormField;
const file = (id: string, name = `${id}.pdf`): IResponseFile => ({ id, name, size: 10, type: 'application/pdf', url: `/x/${name}`, uploadTime: '2026-01-01' });
const item = (over: Partial<AnswerItem> & { field?: FormField }): AnswerItem => ({
  key: 'k',
  number: 1,
  label: 'Question',
  value: '',
  files: [],
  ...over,
});

const renderCard = (i: AnswerItem) => render(<AnswerCard item={i} responseId="r1" scope="personal" />);

describe('AnswerCard', () => {
  it('shows the number and label as the heading', () => {
    renderCard(item({ number: 3, label: 'Your name', value: 'Asha' }));
    expect(screen.getByRole('heading', { name: '3. Your name' })).toBeInTheDocument();
    expect(screen.getByText('Asha')).toBeInTheDocument();
  });

  it.each([[''], [null], [[]]])('renders a dash for empty value %j', (value) => {
    renderCard(item({ value: value as AnswerItem['value'], field: field({ type: 'short_text' }) }));
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders a rating as clamped stars with an accessible label', () => {
    renderCard(item({ value: 9 as unknown as AnswerItem['value'], field: field({ type: 'rating' }) }));
    expect(screen.getByRole('img', { name: '5 out of 5' })).toBeInTheDocument();
    expect(screen.getByText('5 / 5')).toBeInTheDocument();
  });

  it('rounds a fractional rating', () => {
    renderCard(item({ value: 3.4 as unknown as AnswerItem['value'], field: field({ type: 'rating' }) }));
    expect(screen.getByRole('img', { name: '3 out of 5' })).toBeInTheDocument();
  });

  it('falls back to the raw text for a non-numeric rating', () => {
    renderCard(item({ value: 'great', field: field({ type: 'rating' }) }));
    expect(screen.getByText('great')).toBeInTheDocument();
  });

  it('formats currency with the field currency', () => {
    renderCard(item({ value: 50000 as unknown as AnswerItem['value'], field: field({ type: 'currency', currency: 'INR' }) }));
    expect(screen.getByText(/₹\s?50,000/)).toBeInTheDocument();
  });

  it('formats time, date and datetime', () => {
    const { unmount } = renderCard(item({ value: '14:30', field: field({ type: 'time' }) }));
    expect(screen.getByText('2:30 PM')).toBeInTheDocument();
    unmount();
    const d = renderCard(item({ value: '2026-09-25', field: field({ type: 'date' }) }));
    expect(screen.getByText('25 Sep 2026')).toBeInTheDocument();
    d.unmount();
    renderCard(item({ value: '2026-09-25T10:30', field: field({ type: 'datetime' }) }));
    expect(screen.getByText('25 Sep 2026, 10:30 AM')).toBeInTheDocument();
  });

  it('splits an address into lines and drops blanks', () => {
    renderCard(item({ value: '1 Main St\n\nPune\nMH', field: field({ type: 'address' }) }));
    expect(screen.getByText('1 Main St')).toBeInTheDocument();
    expect(screen.getByText('Pune')).toBeInTheDocument();
    expect(screen.getByText('MH')).toBeInTheDocument();
  });

  it('shows a drawn signature as an image and a typed one as text', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    const { unmount } = renderCard(item({ value: png, field: field({ type: 'signature' }) }));
    expect(screen.getByRole('img', { name: 'Drawn signature' })).toHaveAttribute('src', png);
    unmount();
    renderCard(item({ value: 'Asha K', field: field({ type: 'signature' }) }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Asha K')).toBeInTheDocument();
  });

  it('never uses a non-PNG data URL as a signature image', () => {
    renderCard(item({ value: 'data:text/html;base64,AAAA', field: field({ type: 'signature' }) }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('delegates a url answer with its scope', () => {
    renderCard(item({ value: 'https://a.com', field: field({ type: 'url' }) }));
    expect(screen.getByTestId('url-answer')).toHaveTextContent('https://a.com|personal');
  });

  it('renders an array value as one chip per entry', () => {
    renderCard(item({ value: ['Red', 'Blue'], field: field({ type: 'checkbox' }) }));
    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
  });

  it('delegates image uploads, or shows a dash when there are none', () => {
    const f = field({ type: 'image_upload' });
    const { unmount } = renderCard(item({ field: f, files: [file('a'), file('b')] }));
    expect(screen.getByTestId('image-answer')).toHaveTextContent('2 images');
    unmount();
    renderCard(item({ field: f, files: [] }));
    expect(screen.queryByTestId('image-answer')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders one FileAnswer per file for file uploads and for orphaned files', () => {
    const { unmount } = renderCard(item({ field: field({ type: 'file_upload' }), files: [file('a'), file('b')] }));
    expect(screen.getAllByTestId('file-answer')).toHaveLength(2);
    unmount();
    renderCard(item({ field: undefined, files: [file('c')] }));
    expect(screen.getAllByTestId('file-answer')).toHaveLength(1);
  });

  it('shows a dash for a file upload with no files', () => {
    renderCard(item({ field: field({ type: 'file_upload' }), files: [] }));
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('isWideAnswer', () => {
  it.each(['long_text', 'address', 'url', 'image_upload', 'file_upload', 'signature', 'checkbox', 'multiple_choice'])('is wide for field type %s', (type) => {
    expect(isWideAnswer(item({ field: field({ type }), value: 'x' }))).toBe(true);
  });

  it('is narrow for a short value on a short field', () => {
    expect(isWideAnswer(item({ field: field({ type: 'short_text' }), value: 'short' }))).toBe(false);
  });

  it('is wide when the text is over 60 chars or has a newline, even without a field', () => {
    expect(isWideAnswer(item({ value: 'x'.repeat(61) }))).toBe(true);
    expect(isWideAnswer(item({ value: 'x'.repeat(60) }))).toBe(false);
    expect(isWideAnswer(item({ value: 'a\nb' }))).toBe(true);
  });
});
