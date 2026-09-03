/**
 * __tests__/components/ui/AppShell.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from '@/components/ui/AppShell';

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
