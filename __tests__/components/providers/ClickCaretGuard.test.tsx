import { describe, it, expect } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { ClickCaretGuard } from '@/components/providers/ClickCaretGuard';

const clicked = () => document.documentElement.hasAttribute('data-clicked');

describe('ClickCaretGuard', () => {
  it('marks the page after a click and removes the mark when the cursor is moved by keyboard', () => {
    const { unmount } = render(<ClickCaretGuard />);
    expect(clicked()).toBe(false);
    fireEvent.pointerDown(document.body);
    expect(clicked()).toBe(true);
    fireEvent.keyDown(document.body, { key: 'a' });
    fireEvent.keyDown(document.body, { key: 'Tab' });
    expect(clicked()).toBe(true);
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(clicked()).toBe(false);
    fireEvent.pointerDown(document.body);
    unmount();
    expect(clicked()).toBe(false);
  });

  it('still notices a click that a component keeps to itself', () => {
    render(
      <>
        <ClickCaretGuard />
        <button type="button" onPointerDown={(e) => e.stopPropagation()}>
          Keep
        </button>
      </>
    );
    fireEvent.pointerDown(document.querySelector('button')!);
    expect(clicked()).toBe(true);
  });
});
