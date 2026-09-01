/**
 * __tests__/components/ui/Drawer.test.tsx
 * Feature: sprint-7-foundation
 * Tests: Drawer — focus trap, Escape/backdrop close, scroll lock (shared useFocusTrap with Modal)
 */

import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Drawer } from '@/components/ui/Drawer';

describe('Drawer component', () => {
  it('renders nothing when closed', () => {
    render(
      <Drawer isOpen={false} onClose={() => {}} title="Details">
        content
      </Drawer>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title, description and children when open, focuses the close button', () => {
    render(
      <Drawer isOpen onClose={() => {}} title="Details" description="More info">
        <button>Continue</button>
      </Drawer>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('More info')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('closes on Escape and on backdrop click', () => {
    const onClose = vi.fn();
    render(
      <Drawer isOpen onClose={onClose} title="Details">
        content
      </Drawer>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('locks page scroll while open', () => {
    render(
      <Drawer isOpen onClose={() => {}} title="Details">
        content
      </Drawer>
    );
    expect(document.body.style.overflow).toBe('hidden');
  });
});
