import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyButton } from '@/components/responses/answers/CopyButton';
import { AnswerCard } from '@/components/responses/answers/AnswerCard';
import type { AnswerItem } from '@/lib/responseAnswers';
import type { FormField } from '@/types/form';
import type { IResponseFile } from '@/types/response';

vi.mock('@/components/responses/answers/FileAnswer', () => ({ FileAnswer: () => <div /> }));

const writeText = vi.fn();
const item = (o: Partial<AnswerItem>): AnswerItem => ({ key: 'k', number: 1, label: 'Your name', value: 'Asha', files: [], ...o });

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});
afterEach(() => vi.useRealTimers());

describe('CopyButton', () => {
  it('copies the text and announces "Copied"', async () => {
    render(<CopyButton text="Asha" label="Your name" />);
    await userEvent.click(screen.getByRole('button', { name: 'Copy answer to Your name' }));
    expect(writeText).toHaveBeenCalledWith('Asha');
    expect(screen.getByRole('status')).toHaveTextContent('Copied');
  });

  it('says nothing when the clipboard is blocked', async () => {
    writeText.mockRejectedValue(new Error('blocked'));
    render(<CopyButton text="Asha" label="Your name" />);
    await userEvent.click(screen.getByRole('button', { name: /Copy answer/ }));
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('is reachable by keyboard', async () => {
    render(<CopyButton text="Asha" label="Q" />);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: /Copy answer/ })).toHaveFocus();
  });
});

describe('AnswerCard copy', () => {
  it('offers Copy for a text answer, with its full text', async () => {
    render(<AnswerCard item={item({ value: ['Red', 'Blue'] })} responseId="r" scope="personal" />);
    await userEvent.click(screen.getByRole('button', { name: 'Copy answer to Your name' }));
    expect(writeText).toHaveBeenCalledWith('Red, Blue');
  });

  it('offers nothing for an empty answer or for files', () => {
    const { unmount } = render(<AnswerCard item={item({ value: '' })} responseId="r" scope="personal" />);
    expect(screen.queryByRole('button', { name: /Copy answer/ })).not.toBeInTheDocument();
    unmount();
    render(
      <AnswerCard
        item={item({ value: null, field: { type: 'file_upload' } as unknown as FormField, files: [{ id: 'a', name: 'a.pdf' } as IResponseFile] })}
        responseId="r"
        scope="personal"
      />
    );
    expect(screen.queryByRole('button', { name: /Copy answer/ })).not.toBeInTheDocument();
  });

  it('hides the question number when asked, and keeps the label as the heading', () => {
    render(<AnswerCard item={item({ number: 7 })} responseId="r" scope="personal" showNumbers={false} />);
    expect(screen.getByRole('heading', { name: 'Your name' })).toBeInTheDocument();
  });

  it('density changes the row spacing', () => {
    const { container, rerender } = render(<AnswerCard item={item({})} responseId="r" scope="personal" density="comfortable" />);
    expect(container.firstElementChild).toHaveClass('py-2.5');
    rerender(<AnswerCard item={item({})} responseId="r" scope="personal" density="compact" />);
    expect(container.firstElementChild).toHaveClass('py-1.25');
  });
});
