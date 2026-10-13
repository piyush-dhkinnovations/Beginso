import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsView } from '@/components/settings/SettingsView';
import type { SettingsTab } from '@/components/settings/SettingsTabs';

const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(search),
}));

// Each tab body is a stub with a checkbox that reports dirty state, like the real forms do.
const mounts: Record<string, number> = {};
function stub(name: string) {
  return function Stub({ onDirtyChange, scope }: { onDirtyChange?: (d: boolean) => void; scope?: string }) {
    mounts[name] = (mounts[name] ?? 0) + 1;
    return (
      <div data-testid={`tab-${name}`} data-scope={scope ?? ''}>
        <label>
          {name} dirty
          <input type="checkbox" onChange={(e) => onDirtyChange?.(e.target.checked)} />
        </label>
      </div>
    );
  };
}
vi.mock('@/components/settings/ProfileTab', () => ({ ProfileTab: stub('profile') }));
vi.mock('@/components/settings/WorkspaceTab', () => ({ WorkspaceTab: stub('workspace') }));
vi.mock('@/components/settings/BrandingTab', () => ({ BrandingTab: stub('branding') }));
vi.mock('@/components/settings/NotificationsTab', () => ({ NotificationsTab: stub('notifications') }));
vi.mock('@/components/settings/SecurityTab', () => ({ SecurityTab: stub('security') }));
vi.mock('@/components/settings/SessionsTab', () => ({ SessionsTab: stub('sessions') }));
vi.mock('@/components/settings/DataTab', () => ({ DataTab: stub('data') }));
vi.mock('@/components/settings/TagManager', () => ({ TagManager: stub('tags') }));
vi.mock('@/components/settings/StageManager', () => ({ StageManager: stub('stages') }));
vi.mock('@/components/scoring/CriteriaManager', () => ({ CriteriaManager: stub('scoring') }));

const tabs: SettingsTab[] = ['profile', 'workspace', 'security'];
const renderView = (over: Partial<React.ComponentProps<typeof SettingsView>> = {}) =>
  render(<SettingsView title="Settings" description="Manage things" tabs={tabs} {...over} />);

beforeEach(() => {
  search = '';
  replace.mockClear();
  Object.keys(mounts).forEach((k) => delete mounts[k]);
});

describe('SettingsView', () => {
  it('shows the header and only the requested tabs', () => {
    renderView();
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Profile', 'Workspace', 'Security']);
  });

  it('opens the first tab by default and mounts only that tab', () => {
    renderView();
    expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('tab-profile')).toBeInTheDocument();
    expect(screen.queryByTestId('tab-workspace')).not.toBeInTheDocument();
  });

  it('honours ?tab= when it is offered', () => {
    search = 'tab=security';
    renderView();
    expect(screen.getByRole('tab', { name: 'Security' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('tab-security')).toBeInTheDocument();
  });

  it('ignores a ?tab= that this page does not offer', () => {
    search = 'tab=tags';
    renderView();
    expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
  });

  it('applies label overrides', () => {
    renderView({ labels: { workspace: 'General' } });
    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument();
  });

  it('passes the workspace scope to scoped tabs', () => {
    search = 'tab=workspace';
    renderView({ scope: 'acme' });
    expect(screen.getByTestId('tab-workspace')).toHaveAttribute('data-scope', 'acme');
  });

  it('switching tabs updates the URL when nothing is dirty', async () => {
    renderView();
    await userEvent.click(screen.getByRole('tab', { name: 'Workspace' }));
    expect(replace).toHaveBeenCalledWith('/settings?tab=workspace', { scroll: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clicking the active tab does nothing', async () => {
    renderView();
    await userEvent.click(screen.getByRole('tab', { name: 'Profile' }));
    expect(replace).not.toHaveBeenCalled();
  });

  it('warns before leaving a dirty tab and Stay keeps you there', async () => {
    renderView();
    await userEvent.click(screen.getByLabelText('profile dirty'));
    await userEvent.click(screen.getByRole('tab', { name: 'Workspace' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Leave without saving?');
    expect(screen.getByRole('dialog')).toHaveTextContent('Your changes to Profile will be lost.');
    expect(replace).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Stay' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('Leave without saving navigates and clears the dirty mark', async () => {
    renderView();
    await userEvent.click(screen.getByLabelText('profile dirty'));
    expect(screen.getByRole('tab', { name: /Profile/ }).textContent).toContain('Profile');
    await userEvent.click(screen.getByRole('tab', { name: 'Workspace' }));
    await userEvent.click(screen.getByRole('button', { name: 'Leave without saving' }));
    expect(replace).toHaveBeenCalledWith('/settings?tab=workspace', { scroll: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Dirty flag was cleared, so the next attempt goes straight through.
    replace.mockClear();
    await userEvent.click(screen.getByRole('tab', { name: 'Security' }));
    expect(replace).toHaveBeenCalledWith('/settings?tab=security', { scroll: false });
  });

  it('keeps a visited tab mounted (hidden) so unsaved edits survive switching', () => {
    search = 'tab=profile';
    const { rerender } = renderView();
    const profile = screen.getByTestId('tab-profile');
    const profileMountsBefore = mounts.profile;
    search = 'tab=workspace';
    rerender(<SettingsView title="Settings" description="Manage things" tabs={tabs} />);
    expect(screen.getByTestId('tab-profile')).toBe(profile);
    expect(profile.parentElement).toHaveClass('hidden');
    expect(screen.getByTestId('tab-workspace').parentElement).not.toHaveClass('hidden');
    expect(mounts.profile).toBe(profileMountsBefore + 1); // re-rendered, never remounted
    // never-visited tabs stay unmounted
    expect(screen.queryByTestId('tab-security')).not.toBeInTheDocument();
  });
});
