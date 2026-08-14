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
  it('renders all 5 active tabs', () => {
    render(<SettingsTabs activeTab="profile" onChange={vi.fn()} />);
    ['Profile', 'Workspace', 'Branding', 'Notifications', 'Security'].forEach((label) => {
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
});
