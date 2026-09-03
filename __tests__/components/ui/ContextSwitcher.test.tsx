/**
 * __tests__/components/ui/ContextSwitcher.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContextSwitcher } from '@/components/ui/ContextSwitcher';

describe('ContextSwitcher component', () => {
  it('renders a static trigger and does not throw when given no workspace list', () => {
    expect(() => render(<ContextSwitcher />)).not.toThrow();
    expect(screen.getByRole('button', { name: /Personal/ })).toBeInTheDocument();
  });

  it('shows the current label and workspace count when given one', () => {
    render(<ContextSwitcher currentLabel="Acme Inc" workspaces={[{ id: '1', name: 'Acme Inc' }]} />);
    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
