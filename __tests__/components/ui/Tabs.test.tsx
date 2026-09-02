/**
 * __tests__/components/ui/Tabs.test.tsx
 * Feature: sprint-7-foundation
 * Tests: Tabs — role/aria-selected wiring, click switches, arrow-key navigation
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from '@/components/ui/Tabs';

const tabs = [
  { id: 'build', label: 'Build' },
  { id: 'settings', label: 'Settings' },
  { id: 'share', label: 'Share' },
];

describe('Tabs component', () => {
  it('renders a tablist with the active tab aria-selected', () => {
    render(<Tabs tabs={tabs} activeId="settings" onChange={() => {}} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Build' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange when a tab is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} activeId="build" onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: 'Share' }));
    expect(onChange).toHaveBeenCalledWith('share');
  });

  it('moves to the next tab with ArrowRight, wrapping at the end', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} activeId="share" onChange={onChange} />);
    screen.getByRole('tab', { name: 'Share' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('build');
  });

  it('only the active tab is in the tab order (roving tabindex)', () => {
    render(<Tabs tabs={tabs} activeId="build" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Build' })).toHaveAttribute('tabIndex', '0');
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('tabIndex', '-1');
  });
});
