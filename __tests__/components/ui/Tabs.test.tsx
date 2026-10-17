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

describe('Tabs: aria-controls only points at a panel that exists (QA A13-005)', () => {
  const tabs = [{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }];

  it('writes no aria-controls unless the caller says which panel the tabs control', () => {
    render(<Tabs tabs={tabs} activeId="all" onChange={() => undefined} />);
    for (const t of screen.getAllByRole('tab')) expect(t).not.toHaveAttribute('aria-controls');
  });

  it('points every tab at the given panel id', () => {
    render(<Tabs tabs={tabs} activeId="all" onChange={() => undefined} panelId="the-panel" />);
    for (const t of screen.getAllByRole('tab')) expect(t).toHaveAttribute('aria-controls', 'the-panel');
  });

  it('accepts a function for one panel per tab', () => {
    render(<Tabs tabs={tabs} activeId="all" onChange={() => undefined} panelId={(id) => `panel-${id}`} />);
    expect(screen.getByRole('tab', { name: 'Unread' })).toHaveAttribute('aria-controls', 'panel-unread');
  });
});

describe('Tabs component', () => {
  it('renders a tablist with the active tab aria-selected', () => {
    render(<Tabs tabs={tabs} activeId="settings" onChange={() => {}} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Build' })).toHaveAttribute('aria-selected', 'false');
  });

  it('names the tablist when ariaLabel is given, and stays unnamed otherwise', () => {
    const { rerender } = render(<Tabs tabs={tabs} activeId="build" onChange={() => {}} ariaLabel="Settings" />);
    expect(screen.getByRole('tablist', { name: 'Settings' })).toBeInTheDocument();

    rerender(<Tabs tabs={tabs} activeId="build" onChange={() => {}} />);
    expect(screen.getByRole('tablist')).not.toHaveAttribute('aria-label');
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
