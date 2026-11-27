/**
 * Tests: SettingsTabs — the tabs render grouped, click fires onChange, unsaved-change dot
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsTabs } from '@/components/settings/SettingsTabs';

describe('SettingsTabs', () => {
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

  it('puts a small icon at the start of every section (decoration only: the name is the word)', () => {
    render(<SettingsTabs activeTab="profile" onChange={vi.fn()} visible={['profile', 'appearance', 'workspace', 'branding', 'notifications', 'tags', 'stages', 'scoring', 'security', 'sessions', 'data']} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(11);
    for (const tab of tabs) {
      const icon = tab.querySelector('svg');
      expect(icon, `${tab.textContent} has an icon`).not.toBeNull();
      expect(icon!.closest('[aria-hidden="true"]')).not.toBeNull();
      // the icon comes first, before the words
      expect(tab.querySelector('span')!.firstElementChild).toContainElement(icon as SVGElement);
    }
    expect(screen.getByRole('tab', { name: 'Appearance' })).toBeInTheDocument();
  });

  it('gives every section a different icon, so they can be told apart by shape', () => {
    render(<SettingsTabs activeTab="profile" onChange={vi.fn()} visible={['profile', 'appearance', 'workspace', 'branding', 'notifications', 'tags', 'stages', 'scoring', 'security', 'sessions', 'data']} />);
    const shapes = screen.getAllByRole('tab').map((t) => t.querySelector('svg')!.getAttribute('class'));
    expect(new Set(shapes).size).toBe(11);
  });
});
