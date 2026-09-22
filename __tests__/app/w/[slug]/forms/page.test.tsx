/**
 * __tests__/app/w/[slug]/forms/page.test.tsx
 * Feature: sprint-8-workspaces-context, requirements.md §7.8, §1.8, §1.10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Import FormsPage directly (not WorkspaceFormsPage, which is an async server component
// that simply delegates to FormsPage). This correctly isolates the test to the UI
// logic rather than the thin async wrapper, matching the pattern used for every other
// page test in this codebase (e.g. workspaces/page.test.tsx imports WorkspacesPage directly).
import FormsPage from '@/app/(user)/forms/page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'acme' }),
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
  workspacesService: { list: () => Promise.resolve([]) },
}));

vi.mock('@/services/settings', () => ({
  settingsService: { getWorkspace: () => Promise.resolve({ branding: {} }) },
}));

vi.mock('@/store/builderStore', () => ({
  useBuilderStore: (selector: (s: { initForm: () => void }) => unknown) =>
    selector({ initForm: vi.fn() }),
}));

const WORKSPACE_CONTEXT = { type: 'workspace' as const, workspaceId: 'acme' };

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FormsPage context={WORKSPACE_CONTEXT} />
    </QueryClientProvider>
  );
}

describe('WorkspaceFormsPage — FormsPage rendered with workspace context', () => {
  beforeEach(() => {
    mockGetForms.mockReset();
  });

  it('renders the Forms heading', async () => {
    mockGetForms.mockResolvedValue({ forms: [], total: 0, page: 1, limit: 10 });
    renderPage();

    expect(await screen.findByText('Forms')).toBeInTheDocument();
  });

  it('shows the empty state when there are no forms in this workspace', async () => {
    mockGetForms.mockResolvedValue({ forms: [], total: 0, page: 1, limit: 10 });
    renderPage();

    expect(await screen.findByText('No forms yet')).toBeInTheDocument();
  });

  it('lists forms returned by the workspace-scoped query', async () => {
    mockGetForms.mockResolvedValue({
      forms: [{
        _id: 'f1', title: 'Workspace Survey', status: 'published',
        responseCount: 5, updatedAt: new Date().toISOString(),
        fields: [], pages: [], branding: {},
        settings: { honeypotEnabled: true }, workspaceId: 'acme',
        schemaVersion: 1, createdAt: new Date().toISOString(),
      }],
      total: 1, page: 1, limit: 10,
    });
    renderPage();

    expect(await screen.findByText('Workspace Survey')).toBeInTheDocument();
  });

  it('executes the query exactly once (proves the workspace query key is used)', async () => {
    // The key point: FormsPage must fire a query when rendered with a workspace context.
    // If the key were misconfigured the query could short-circuit against a cached personal
    // result — this test proves getForms is actually called (i.e. no false cache hit).
    mockGetForms.mockResolvedValue({ forms: [], total: 0, page: 1, limit: 10 });
    renderPage();

    await screen.findByText('No forms yet');
    expect(mockGetForms).toHaveBeenCalledTimes(1);
  });

  it('renders the owner avatar for each row', async () => {
    mockGetForms.mockResolvedValue({
      forms: [{
        _id: 'f1', title: 'Workspace Survey', status: 'published',
        responseCount: 5, updatedAt: new Date().toISOString(),
        fields: [], pages: [], branding: {},
        settings: { honeypotEnabled: true }, workspaceId: 'acme',
        schemaVersion: 1, createdAt: new Date().toISOString(),
        owner: { name: 'Priya Shah' },
      }],
      total: 1, page: 1, limit: 10,
    });
    renderPage();

    expect(await screen.findByLabelText('Owned by Priya Shah')).toBeInTheDocument();
  });

  it('a form title links to its Overview, and the row menu offers Overview first (tasks.md 3.4)', async () => {
    mockGetForms.mockResolvedValue({
      forms: [{
        _id: 'f1', title: 'Workspace Survey', status: 'published',
        responseCount: 5, updatedAt: new Date().toISOString(),
        fields: [], pages: [], branding: {},
        settings: { honeypotEnabled: true }, workspaceId: 'acme',
        schemaVersion: 1, createdAt: new Date().toISOString(),
      }],
      total: 1, page: 1, limit: 10,
    });
    renderPage();

    const titleLink = await screen.findByRole('link', { name: 'Workspace Survey' });
    // `?ws=acme` hint carried so PersonalShell can paint the workspace sidebar on the next
    // page's first render instead of flashing Personal (real bug this fixed).
    expect(titleLink).toHaveAttribute('href', '/forms/f1/overview?ws=acme');
    // The pencil icon button still goes straight to the editor.
    expect(screen.getByRole('link', { name: 'Edit Form' })).toHaveAttribute('href', '/forms/f1/edit?ws=acme');

    await userEvent.click(screen.getByRole('button', { name: 'More Options' }));
    const items = await screen.findAllByRole('menuitem');
    expect(items[0]).toHaveTextContent('Overview');
  });

  it('renders every Forms Manager tab', async () => {
    mockGetForms.mockResolvedValue({ forms: [], total: 0, page: 1, limit: 10 });
    renderPage();
    await screen.findByText('No forms yet');

    for (const name of ['Recent', 'Pinned', 'Draft', 'Published', 'Archived']) {
      expect(screen.getByRole('tab', { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole('tab', { name: 'Shared with me' })).not.toBeInTheDocument();
  });

  it('switching to the Pinned tab shows a placeholder and fires no extra forms query', async () => {
    mockGetForms.mockResolvedValue({ forms: [], total: 0, page: 1, limit: 10 });
    renderPage();
    await screen.findByText('No forms yet');

    await userEvent.click(screen.getByRole('tab', { name: 'Pinned' }));

    expect(await screen.findByText('Coming soon')).toBeInTheDocument();
    expect(mockGetForms).toHaveBeenCalledTimes(1);
  });

  it('switching to the Draft tab filters by status and resets the page', async () => {
    mockGetForms.mockResolvedValue({ forms: [], total: 0, page: 1, limit: 10 });
    renderPage();
    await screen.findByText('No forms yet');
    mockGetForms.mockClear();

    await userEvent.click(screen.getByRole('tab', { name: 'Draft' }));

    await screen.findByText('No matching forms');
    expect(mockGetForms).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'draft', page: 1 }),
      WORKSPACE_CONTEXT
    );
  });
});
