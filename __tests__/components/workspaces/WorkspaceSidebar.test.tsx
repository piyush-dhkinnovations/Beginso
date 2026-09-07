/**
 * __tests__/components/workspaces/WorkspaceSidebar.test.tsx
 * Feature: sprint-8-workspaces-context, requirements.md §7.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkspaceSidebar } from '@/components/workspaces/WorkspaceSidebar';

const mockPathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

describe('WorkspaceSidebar', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/w/acme');
  });

  it('renders every workspace nav item, scoped under the workspace slug', () => {
    render(<WorkspaceSidebar slug="acme" />);
    ['Home', 'Forms', 'Templates', 'Responses', 'Analytics', 'Reports', 'Settings'].forEach((label) => {
      const link = screen.getByRole('link', { name: label });
      expect(link).toHaveAttribute('href', expect.stringContaining('/w/acme'));
    });
  });

  it('marks Home active on the workspace root only', () => {
    mockPathname.mockReturnValue('/w/acme');
    render(<WorkspaceSidebar slug="acme" />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Forms' })).not.toHaveAttribute('aria-current');
  });

  it('marks Forms active on /w/[slug]/forms and its subroutes', () => {
    mockPathname.mockReturnValue('/w/acme/forms/f1');
    render(<WorkspaceSidebar slug="acme" />);
    expect(screen.getByRole('link', { name: 'Forms' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('does not leak another workspace\'s active state', () => {
    mockPathname.mockReturnValue('/w/other-workspace/forms');
    render(<WorkspaceSidebar slug="acme" />);
    expect(screen.getByRole('link', { name: 'Forms' })).not.toHaveAttribute('aria-current');
  });
});
