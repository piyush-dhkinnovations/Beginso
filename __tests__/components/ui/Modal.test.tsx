import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Modal } from '@/components/ui/Modal';

describe('Modal accessibility and scroll behavior', () => {
  it('locks page scroll, focuses the dialog, and restores the opener on close', () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open';
    document.body.appendChild(opener);
    const main = document.createElement('main');
    main.style.overflow = 'auto';
    document.body.appendChild(main);
    opener.focus();

    const onClose = vi.fn();
    const { rerender } = render(
      <Modal isOpen onClose={onClose} title="Confirm">
        <button>Continue</button>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');
    expect(main.style.overflow).toBe('hidden');
    expect(screen.getByRole('button', { name: 'Close modal' })).toHaveFocus();

    rerender(
      <Modal isOpen={false} onClose={onClose} title="Confirm">
        <button>Continue</button>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('');
    expect(main.style.overflow).toBe('auto');
    expect(opener).toHaveFocus();
    opener.remove();
    main.remove();
  });

  it('closes on Escape and backdrop click', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Confirm">
        <button>Continue</button>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
