/**
 * Feature: workspace settings
 * Tests: which tabs each role sees; every member gets Appearance (theme) and Notifications.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const role = vi.hoisted(() => ({ value: 'owner' as string | undefined }));
vi.mock('next/navigation', () => ({ useParams: () => ({ slug: 'acme' }) }));
vi.mock('@/hooks/useWorkspaceRole', () => ({ useWorkspaceRole: () => role.value }));
vi.mock('@/components/settings/SettingsView', () => ({
  SettingsView: ({ tabs, scope }: { tabs: string[]; scope: string }) => <div data-testid="view" data-scope={scope}>{tabs.join(',')}</div>,
}));

import WorkspaceSettingsPage from '@/app/w/[slug]/settings/page';

describe('workspace settings page', () => {
  it('gives an owner every tab, including Appearance', () => {
    role.value = 'owner';
    render(<WorkspaceSettingsPage />);
    const tabs = screen.getByTestId('view').textContent!.split(',');
    expect(tabs).toEqual(expect.arrayContaining(['workspace', 'branding', 'tags', 'stages', 'scoring', 'appearance', 'notifications']));
    expect(screen.getByTestId('view')).toHaveAttribute('data-scope', 'acme');
  });

  it('gives the lowest role at least Appearance and Notifications', () => {
    role.value = 'viewer';
    render(<WorkspaceSettingsPage />);
    const tabs = screen.getByTestId('view').textContent!.split(',');
    expect(tabs).toContain('appearance');
    expect(tabs).toContain('notifications');
    expect(tabs).not.toContain('branding');
  });
});
