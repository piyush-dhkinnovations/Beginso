/**
 * __tests__/components/ui/Sidebar.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/ui/Sidebar';

describe('Sidebar component', () => {
  it('renders group labels and nav items, marking the active one', () => {
    render(
      <Sidebar
        groups={[
          { label: 'Workspace', items: [{ label: 'Forms', href: '/forms', active: true }, { label: 'Responses', href: '/responses' }] },
        ]}
      />
    );
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Forms/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Responses/ })).not.toHaveAttribute('aria-current');
  });

  it('applies the rail class when collapsed', () => {
    const { container } = render(<Sidebar groups={[]} collapsed />);
    expect(container.firstElementChild?.className).toMatch(/bg-sidenav-rail/);
  });
});
