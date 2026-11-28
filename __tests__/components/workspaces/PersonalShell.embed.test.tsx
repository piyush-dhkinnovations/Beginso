/**
 * The form preview in the Branding studio's frame is the form alone. With the app's own frame around it (sidebar, top bar, a generic loading
 * page) the frame showed first, so the preview pane looked like the dashboard for a few seconds before the form.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const nav = vi.hoisted(() => ({ pathname: '/forms/f1/preview', search: 'embed=1' }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { PersonalShell, isFormPreview } from '@/components/workspaces/PersonalShell';
import Loading from '@/app/(user)/forms/[id]/loading';

describe('a form preview', () => {
  it('is recognised by its address, and nothing else is', () => {
    expect(isFormPreview('/forms/f1/preview')).toBe(true);
    expect(isFormPreview('/forms/f1/preview/')).toBe(true);
    expect(isFormPreview('/forms/f1/edit')).toBe(false);
    expect(isFormPreview('/dashboard')).toBe(false);
  });

  it.each(['', 'embed=1', 'bare=1'])('is drawn with no app frame around it (?%s)', (search) => {
    nav.pathname = '/forms/f1/preview';
    nav.search = search;
    const { container } = render(
      <PersonalShell initialCollapsed={false}>
        <p>the form</p>
      </PersonalShell>,
    );
    expect(screen.getByText('the form')).toBeInTheDocument();
    expect(container.querySelector('aside, header, nav')).toBeNull();
  });
});

describe('the loading page of the form preview', () => {
  it('is a quiet placeholder, not the generic page shape (which looks like the dashboard)', () => {
    nav.pathname = '/forms/f1/preview';
    render(<Loading />);
    expect(screen.getByRole('status', { name: 'Loading the form preview' })).toBeInTheDocument();
  });
});
