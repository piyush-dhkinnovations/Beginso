import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeInput } from '@/components/ui/CodeInput';

function Harness({ onComplete = vi.fn(), error }: { onComplete?: (v: string) => void; error?: string | null }) {
  const [value, setValue] = useState('');
  return <CodeInput label="Your code" value={value} onChange={setValue} onComplete={onComplete} error={error} autoFocus />;
}
const box = (n: number) => screen.getByLabelText(`Digit ${n} of 6`) as HTMLInputElement;
const values = () => [1, 2, 3, 4, 5, 6].map((n) => box(n).value).join('|');

describe('CodeInput', () => {
  it('is one labelled group of six single-digit boxes, with the cursor in the first', () => {
    render(<Harness />);
    expect(screen.getByRole('group', { name: 'Your code' })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
    expect(box(1)).toHaveFocus();
    expect(box(1)).toHaveAttribute('autocomplete', 'one-time-code');
    expect(box(2)).toHaveAttribute('autocomplete', 'off');
    expect(box(1)).toHaveAttribute('inputmode', 'numeric');
  });

  it('typing fills one box at a time and moves on; completing calls onComplete once with the whole code', async () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    await userEvent.keyboard('48291');
    expect(values()).toBe('4|8|2|9|1|');
    expect(box(6)).toHaveFocus();
    expect(onComplete).not.toHaveBeenCalled();
    await userEvent.keyboard('3');
    expect(values()).toBe('4|8|2|9|1|3');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('482913');
  });

  it('ignores anything that is not a digit', async () => {
    render(<Harness />);
    await userEvent.keyboard('4a-8 z2');
    expect(values()).toBe('4|8|2|||');
  });

  it('a paste spreads the whole code over the boxes, ignoring spaces and dashes, wherever it lands', async () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    await userEvent.click(box(4));
    await userEvent.paste('482-913');
    expect(values()).toBe('4|8|2|9|1|3');
    expect(onComplete).toHaveBeenCalledWith('482913');
  });

  it('a short paste goes in from the box it was pasted into', async () => {
    render(<Harness />);
    await userEvent.keyboard('12');
    await userEvent.paste('34');
    expect(values()).toBe('1|2|3|4||');
  });

  it('too many digits in a paste are cut to six', async () => {
    render(<Harness />);
    await userEvent.paste('12345678');
    expect(values()).toBe('1|2|3|4|5|6');
  });

  it('Backspace clears the box, or steps back when it is already empty; the arrows move without changing anything', async () => {
    render(<Harness />);
    await userEvent.keyboard('123');
    await userEvent.keyboard('{Backspace}'); // box 4 is empty: clears box 3
    expect(values()).toBe('1|2||||');
    expect(box(3)).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(box(2)).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(box(4)).toHaveFocus();
    expect(values()).toBe('1|2||||');
  });

  it('shows an error under the boxes and marks them invalid', () => {
    render(<Harness error="That code is not right." />);
    expect(screen.getByRole('alert')).toHaveTextContent('That code is not right.');
    expect(box(1)).toHaveAttribute('aria-invalid', 'true');
  });
});
