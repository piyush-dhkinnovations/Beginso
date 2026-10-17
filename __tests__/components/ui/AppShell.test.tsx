/**
 * __tests__/components/ui/AppShell.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from '@/components/ui/AppShell';

// QA A3-008: at 768px the full sidebar took about 29% of the screen. On a tablet it now starts as the icon rail.
describe('AppShell on a tablet', () => {
  const mockWidth = (matchesTablet: boolean) =>
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('min-width: 768px') ? matchesTablet : false, media: q, addEventListener() {}, removeEventListener() {} }));
  afterEach(() => vi.unstubAllGlobals());
  const shell = () =>
    render(
      <AppShell
        sidebar={(collapsed) => <nav data-testid="sidebar" data-collapsed={collapsed} />}
        topBar={(toggle) => <button onClick={toggle} aria-label="Toggle sidebar">Toggle</button>}
      >
        <p>Content</p>
      </AppShell>
    );

  it('starts collapsed on a tablet, even though the saved preference is expanded', () => {
    document.cookie = 'sidebar_collapsed=false; path=/';
    mockWidth(true);
    shell();
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'true');
  });

  it('the menu button opens it on a tablet, and does not overwrite the saved desktop preference', async () => {
    document.cookie = 'sidebar_collapsed=false; path=/';
    mockWidth(true);
    const user = userEvent.setup();
    shell();
    await user.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'false');
    expect(document.cookie).toContain('sidebar_collapsed=false');
    await user.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'true');
  });

  it('stays expanded on a desktop that has no saved preference', () => {
    document.cookie = 'sidebar_collapsed=; path=/; max-age=0';
    mockWidth(false);
    shell();
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'false');
  });
});

describe('AppShell component', () => {
  it('renders the sidebar, top bar and content slots, and starts from initialCollapsed', () => {
    render(
      <AppShell
        initialCollapsed
        sidebar={(collapsed) => <nav data-testid="sidebar" data-collapsed={collapsed} />}
        topBar={() => <header data-testid="topbar" />}
      >
        <p>Content</p>
      </AppShell>
    );
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'true');
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('toggles collapsed state and persists it to the sidebar_collapsed cookie', async () => {
    document.cookie = 'sidebar_collapsed=; path=/; max-age=0';
    const user = userEvent.setup();
    render(
      <AppShell
        sidebar={(collapsed) => <nav data-testid="sidebar" data-collapsed={collapsed} />}
        topBar={(toggle) => (
          <button onClick={toggle} aria-label="Toggle sidebar">
            Toggle
          </button>
        )}
      >
        <p>Content</p>
      </AppShell>
    );
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'false');
    await user.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'true');
    expect(document.cookie).toContain('sidebar_collapsed=true');
  });
});
