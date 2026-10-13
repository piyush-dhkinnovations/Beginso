/**
 * __tests__/components/settings/SettingsTabs.test.tsx
 * Feature: sprint-6-settings
 * Tests: SettingsTabs — 5 active tabs render, click fires onChange, unsaved-change dot
 * Requirements: 1.1, 12.2
 * Note: the 6th "Billing & Integrations" disabled slot (originally Requirement 1.6) was removed
 * from the UI by explicit product decision — see requirements.md/tasks.md Notes.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsTabs } from '@/components/settings/SettingsTabs';

describe('SettingsTabs', () => {
  // Sprint 12 (inbox-collaboration), task 2.5/5.1/5.2: gains a 7th "Tags" tab, an 8th "Stages"
  // tab, and a 9th "Scoring" tab (OQ-7 resolved 3 Oct 2026), last.
  it('renders all 10 tabs, grouped', () => {
    render(<SettingsTabs activeTab="profile" onChange={vi.fn()} />);
    // Grouped vertical nav: General, Response handling, then Account.
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Profile', 'Appearance', 'Workspace', 'Branding', 'Notifications', 'Tags', 'Stages', 'Scoring', 'Security', 'Sessions & Devices',
    ]);
    ['Profile', 'Appearance', 'Workspace', 'Branding', 'Notifications', 'Security', 'Sessions & Devices', 'Tags', 'Stages', 'Scoring'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    expect(screen.queryByText('Billing & Integrations')).not.toBeInTheDocument();
  });

  it('marks the active tab with aria-selected', () => {
    render(<SettingsTabs activeTab="workspace" onChange={vi.fn()} />);
    expect(screen.getByText('Workspace').closest('button')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Profile').closest('button')).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with the clicked tab id', () => {
    const onChange = vi.fn();
    render(<SettingsTabs activeTab="profile" onChange={onChange} />);
    fireEvent.click(screen.getByText('Security'));
    expect(onChange).toHaveBeenCalledWith('security');
  });

  it('shows an unsaved-changes indicator only for tabs in dirtyTabs', () => {
    render(<SettingsTabs activeTab="profile" onChange={vi.fn()} dirtyTabs={new Set(['profile'])} />);
    const profileTab = screen.getByText('Profile').closest('button')!;
    const workspaceTab = screen.getByText('Workspace').closest('button')!;
    expect(profileTab.querySelector('[aria-label="Unsaved changes"]')).toBeInTheDocument();
    expect(workspaceTab.querySelector('[aria-label="Unsaved changes"]')).not.toBeInTheDocument();
  });

  // sprint-10 requirements.md §7.12/§7.13 — new tab, and the strip now rides ui/Tabs.
  it('calls onChange with "sessions" for the Sessions & Devices tab', () => {
    const onChange = vi.fn();
    render(<SettingsTabs activeTab="profile" onChange={onChange} />);
    fireEvent.click(screen.getByText('Sessions & Devices'));
    expect(onChange).toHaveBeenCalledWith('sessions');
  });

  it('marks the sessions tab active', () => {
    render(<SettingsTabs activeTab="sessions" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Sessions & Devices' })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the named "Settings" tablist and carries no hardcoded neutral colour classes', () => {
    const { container } = render(<SettingsTabs activeTab="profile" onChange={vi.fn()} />);
    expect(screen.getByRole('tablist', { name: 'Settings' })).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/neutral-\d|bg-white|brand-\d/);
  });

  it('moves between tabs with the arrow keys (ui/Tabs behaviour the old strip lacked)', () => {
    const onChange = vi.fn();
    render(<SettingsTabs activeTab="profile" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Profile' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('appearance');
  });
});
