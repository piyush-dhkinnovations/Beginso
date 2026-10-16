/**
 * __tests__/components/ui/Sidebar.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/ui/Sidebar';
import { Home } from 'lucide-react';

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

describe('Sidebar (collapsed rail)', () => {
  it('gives every icon-only link an accessible name and a tooltip', () => {
    render(<Sidebar collapsed groups={[{ items: [{ label: 'Insights', href: '/insights', icon: Home }] }]} />);
    const link = screen.getByRole('link', { name: 'Insights' });
    expect(link).toHaveAttribute('title', 'Insights');
  });

  it('adds neither when expanded (the visible label is the name)', () => {
    render(<Sidebar groups={[{ items: [{ label: 'Insights', href: '/insights', icon: Home }] }]} />);
    expect(screen.getByRole('link', { name: 'Insights' })).not.toHaveAttribute('title');
  });
});
