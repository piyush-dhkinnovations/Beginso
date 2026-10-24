import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormModeSwitch } from '@/components/forms/FormModeSwitch';

const nav = vi.hoisted(() => ({ pathname: '/forms/f1/inbox', push: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname, useRouter: () => ({ push: nav.push }) }));

describe('FormModeSwitch', () => {
  beforeEach(() => {
    nav.pathname = '/forms/f1/inbox';
    nav.push.mockReset();
  });

  it('marks Responses on the Responses page and Summary on the Summary page (trailing slash tolerated)', () => {
    const { unmount } = render(<FormModeSwitch formId="f1" ws={null} />);
    expect(screen.getByRole('button', { name: 'Responses' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Summary' })).toHaveAttribute('aria-pressed', 'false');
    unmount();
    nav.pathname = '/forms/f1/insights/';
    render(<FormModeSwitch formId="f1" ws={null} />);
    expect(screen.getByRole('button', { name: 'Summary' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('goes to the other page, and keeps the workspace in the address', async () => {
    render(<FormModeSwitch formId="f1" ws="acme" />);
    await userEvent.click(screen.getByRole('button', { name: 'Summary' }));
    expect(nav.push).toHaveBeenCalledWith('/forms/f1/insights?ws=acme');
  });
});
