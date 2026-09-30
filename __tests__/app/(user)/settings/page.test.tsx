/**
 * __tests__/app/(user)/settings/page.test.tsx
 * sprint-10-events-migration, tasks.md 5.4 — requirements.md §7.12. Every tab body is stubbed: this
 * covers only the page's own wiring (valid tab ids, and the mounted-once/hidden-not-unmounted rule
 * CLAUDE.md documents), not what any tab renders.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsPage from '@/app/(user)/settings/page';

const mockReplace = vi.fn();
let mockTab: string | null = null;
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/settings',
  useSearchParams: () => ({ get: (key: string) => (key === 'tab' ? mockTab : null) }),
}));

vi.mock('@/components/settings/ProfileTab', () => ({ ProfileTab: () => <div>profile-body</div> }));
vi.mock('@/components/settings/WorkspaceTab', () => ({ WorkspaceTab: () => <div>workspace-body</div> }));
vi.mock('@/components/settings/BrandingTab', () => ({ BrandingTab: () => <div>branding-body</div> }));
vi.mock('@/components/settings/NotificationsTab', () => ({ NotificationsTab: () => <div>notifications-body</div> }));
vi.mock('@/components/settings/SecurityTab', () => ({ SecurityTab: () => <div>security-body</div> }));
vi.mock('@/components/settings/SessionsTab', () => ({ SessionsTab: () => <div>sessions-body</div> }));
vi.mock('@/components/settings/TagManager', () => ({ TagManager: () => <div>tags-body</div> }));
vi.mock('@/hooks/useTagManagerScope', () => ({ useTagManagerScope: () => undefined }));
vi.mock('@/components/settings/StageManager', () => ({ StageManager: () => <div>stages-body</div> }));
vi.mock('@/hooks/useStageManagerScope', () => ({ useStageManagerScope: () => undefined }));
vi.mock('@/components/scoring/CriteriaManager', () => ({ CriteriaManager: () => <div>scoring-body</div> }));
vi.mock('@/hooks/useScoreCriteriaScope', () => ({ useScoreCriteriaScope: () => undefined }));

describe('SettingsPage tab wiring', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockTab = null;
  });

  it('accepts ?tab=sessions and shows the Sessions & Devices tab as active', () => {
    mockTab = 'sessions';
    render(<SettingsPage />);

    expect(screen.getByRole('tab', { name: 'Sessions & Devices' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('sessions-body')).toBeVisible();
  });

  it('falls back to Profile for an unknown ?tab= value', () => {
    mockTab = 'danger';
    render(<SettingsPage />);

    expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText('sessions-body')).not.toBeInTheDocument();
  });

  it('does not mount a tab that was never visited (no over-fetching on mount)', () => {
    render(<SettingsPage />);

    expect(screen.getByText('profile-body')).toBeInTheDocument();
    expect(screen.queryByText('sessions-body')).not.toBeInTheDocument();
    expect(screen.queryByText('security-body')).not.toBeInTheDocument();
  });

  it('keeps a visited tab mounted but hidden after switching away, not unmounted', () => {
    mockTab = 'sessions';
    const { rerender } = render(<SettingsPage />);
    expect(screen.getByText('sessions-body')).toBeVisible();

    mockTab = 'security';
    rerender(<SettingsPage />);

    expect(screen.getByText('security-body')).toBeVisible();
    expect(screen.getByText('sessions-body')).toBeInTheDocument();
    expect(screen.getByText('sessions-body').parentElement).toHaveClass('hidden');
  });

  it('navigates to ?tab=sessions when the tab is clicked', () => {
    render(<SettingsPage />);
    screen.getByRole('tab', { name: 'Sessions & Devices' }).click();

    expect(mockReplace).toHaveBeenCalledWith('/settings?tab=sessions', { scroll: false });
  });

  // Sprint 12 (inbox-collaboration), task 2.5 — the Tags tab joins the same visitedTabs set as
  // every other tab.
  it('accepts ?tab=tags and shows the Tags tab as active', () => {
    mockTab = 'tags';
    render(<SettingsPage />);

    expect(screen.getByRole('tab', { name: 'Tags' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('tags-body')).toBeVisible();
  });
});
