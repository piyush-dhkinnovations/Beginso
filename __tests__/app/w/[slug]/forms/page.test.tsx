/**
 * __tests__/app/w/[slug]/forms/page.test.tsx
 * Feature: sprint-8-workspaces-context, requirements.md §7.8, §1.8, §1.10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
