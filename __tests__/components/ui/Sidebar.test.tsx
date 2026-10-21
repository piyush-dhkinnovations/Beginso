/**
 * __tests__/components/ui/Sidebar.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '@/components/ui/Sidebar';
import { Home } from 'lucide-react';

describe('Sidebar component', () => {
  it('says what a count badge counts (tooltip and screen-reader text), so it is never mistaken for a total', () => {
    render(<Sidebar groups={[{ items: [{ label: 'Responses', href: '/r', count: 70, countLabel: 'unread' }, { label: 'Plain', href: '/p', count: 3 }] }]} />);
    expect(screen.getByRole('link', { name: 'Responses 70 unread' })).toBeInTheDocument();
    expect(screen.getByText('70').closest('span')).toHaveAttribute('title', '70 unread');
    // A badge without a label keeps its old, bare form.
    expect(screen.getByRole('link', { name: 'Plain 3' })).toBeInTheDocument();
  });

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
  const rail = () => render(<Sidebar collapsed groups={[{ items: [{ label: 'Insights', href: '/insights', icon: Home }] }]} />);

  it('gives every icon-only link an accessible name', () => {
    rail();
    expect(screen.getByRole('link', { name: 'Insights' })).toHaveAttribute('aria-label', 'Insights');
  });

  // QA A3-006: the native title never showed for a keyboard user. The label now appears on keyboard focus as well as hover.
  it('shows the label on keyboard focus, and Esc hides it', () => {
    rail();
    const link = screen.getByRole('link', { name: 'Insights' });
    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
    fireEvent.focus(link);
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Insights');
    fireEvent.keyDown(link, { key: 'Escape' });
    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
  });

  it('shows the label on mouse hover and hides it on leave, and on blur', () => {
    rail();
    const link = screen.getByRole('link', { name: 'Insights' });
    fireEvent.mouseEnter(link);
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Insights');
    fireEvent.mouseLeave(link);
    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
    fireEvent.focus(link);
    fireEvent.blur(link);
    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
  });

  it('does not rely on a native title (it would show a second tooltip)', () => {
    rail();
    expect(screen.getByRole('link', { name: 'Insights' })).not.toHaveAttribute('title');
  });

  it('adds none of this when expanded (the visible label is the name)', () => {
    render(<Sidebar groups={[{ items: [{ label: 'Insights', href: '/insights', icon: Home }] }]} />);
    const link = screen.getByRole('link', { name: 'Insights' });
    expect(link).not.toHaveAttribute('title');
    expect(link).not.toHaveAttribute('aria-label');
    fireEvent.focus(link);
    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
  });
});
