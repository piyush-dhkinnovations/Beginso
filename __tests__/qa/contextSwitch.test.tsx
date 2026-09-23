/**
 * __tests__/qa/contextSwitch.test.tsx
 * sprint-11-v2a-hardening, requirements.md §7.3 (2.5)
 *
 * The one query-key isolation property (workspaceKeys.forms() namespaced by context, no
 * cross-context cache bleed) is already proven by __tests__/lib/queryKeys.test.ts (2.6). What
 * that alone can't prove: a component instance that survives a context switch without unmounting
 * (workspace A -> workspace B is the same route pattern, /w/[slug]/forms, so Next.js can reuse the
 * same FormsPage instance rather than remount it) might still carry local UI state — an open
 * FormAccessPanel/MoveFormModal bound to a form from the space just left. That's this file's job.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FormsPage from '@/app/(user)/forms/page';
import type { FormsContext } from '@/types/workspace';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/w/acme/forms',
}));

vi.mock('@/components/common/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com' } }),
}));

const mockGetForms = vi.fn();
vi.mock('@/services/forms', () => ({
  formsService: {
    getForms: (...args: unknown[]) => mockGetForms(...args),
    moveForm: vi.fn(),
    duplicateForm: vi.fn(),
    deleteForm: vi.fn(),
    createForm: vi.fn(),
    updateForm: vi.fn(),
  },
}));

vi.mock('@/services/workspaces', () => ({
  workspacesService: { list: () => Promise.resolve([{ id: 'wa', name: 'A', slug: 'a', role: 'owner' }, { id: 'wb', name: 'B', slug: 'b', role: 'owner' }]) },
}));

vi.mock('@/services/settings', () => ({
  settingsService: { getWorkspace: () => Promise.resolve({ branding: {} }) },
}));

vi.mock('@/store/builderStore', () => ({
  useBuilderStore: (selector: (s: { initForm: () => void }) => unknown) => selector({ initForm: vi.fn() }),
}));

vi.mock('@/services/team', () => ({
  teamService: { listFormAccess: () => Promise.resolve([]) },
}));

function formsFor(workspaceId: string) {
  const base = {
    status: 'published' as const, responseCount: 0, updatedAt: new Date().toISOString(),
    fields: [], pages: [], branding: {}, settings: { honeypotEnabled: true },
    workspaceId, schemaVersion: 1, createdAt: new Date().toISOString(),
  };
  return [{ ...base, _id: `${workspaceId}-f1`, title: `${workspaceId} Form` }];
}

describe('Context switch — no stale panel bound to the previous context', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockGetForms.mockReset();
  });

  it('switching workspace A -> B on the same mounted instance closes an open Share access panel from A', async () => {
    const CTX_A: FormsContext = { type: 'workspace', workspaceId: 'a' };
    const CTX_B: FormsContext = { type: 'workspace', workspaceId: 'b' };

    mockGetForms.mockImplementation(() => Promise.resolve({ forms: formsFor('a'), total: 1, page: 1, limit: 10 }));

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <FormsPage context={CTX_A} />
      </QueryClientProvider>
    );

    await screen.findByText('a Form');
    await userEvent.click(screen.getByRole('button', { name: 'More Options' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /Share access/ }));
    expect(await screen.findByRole('heading', { name: 'Share access to a Form' })).toBeInTheDocument();
    // FormAccessPanel is open, bound to workspace A's form.

    mockGetForms.mockImplementation(() => Promise.resolve({ forms: formsFor('b'), total: 1, page: 1, limit: 10 }));
    rerender(
      <QueryClientProvider client={queryClient}>
        <FormsPage context={CTX_B} />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText('b Form')).toBeInTheDocument());
    // The panel must not still be showing workspace A's form — either fully closed, or if still
    // open, rebound to B's form, never left pointing at A's.
    expect(screen.queryByRole('heading', { name: 'Share access to a Form' })).not.toBeInTheDocument();
  });
});
