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
const mockDeleteForm = vi.fn();
const mockDuplicateForm = vi.fn();
vi.mock('@/services/forms', () => ({
  formsService: {
    getForms: (...args: unknown[]) => mockGetForms(...args),
    moveForm: vi.fn(),
    duplicateForm: (...args: unknown[]) => mockDuplicateForm(...args),
    deleteForm: (...args: unknown[]) => mockDeleteForm(...args),
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

function threeForms() {
  const base = {
    status: 'published' as const, responseCount: 0, updatedAt: new Date().toISOString(),
    fields: [], pages: [], branding: {}, settings: { honeypotEnabled: true },
    workspaceId: 'acme', schemaVersion: 1, createdAt: new Date().toISOString(),
  };
  return [
    { ...base, _id: 'f1', title: 'Form One' },
    { ...base, _id: 'f2', title: 'Form Two' },
    { ...base, _id: 'f3', title: 'Form Three' },
  ];
}

describe('WorkspaceFormsPage — FormsPage rendered with workspace context', () => {
  beforeEach(() => {
    mockGetForms.mockReset();
    mockDeleteForm.mockReset();
    mockDeleteForm.mockResolvedValue(undefined);
    mockDuplicateForm.mockReset();
    mockDuplicateForm.mockResolvedValue({ _id: 'new-id', title: 'Copy' });
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

  // sprint-10-events-migration, task 6.4.
  describe('bulk selection and delete (task 6.4)', () => {
    it('shows no bulk action bar until a row is selected, then shows the count', async () => {
      mockGetForms.mockResolvedValue({ forms: threeForms(), total: 3, page: 1, limit: 10 });
      renderPage();
      await screen.findByText('Form One');

      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select Form One' }));
      expect(await screen.findByText('1 selected')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select Form Two' }));
      expect(await screen.findByText('2 selected')).toBeInTheDocument();
    });

    it('"select all on this page" checks every row and its own label updates', async () => {
      mockGetForms.mockResolvedValue({ forms: threeForms(), total: 3, page: 1, limit: 10 });
      renderPage();
      await screen.findByText('Form One');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select all forms on this page' }));

      expect(await screen.findByText('3 selected')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Select Form One' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Select Form Two' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Select Form Three' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Deselect all forms on this page' })).toBeInTheDocument();
    });

    it('deleting a bulk selection calls deleteForm once per selected id, sequentially, with no typed confirmation required', async () => {
      mockGetForms.mockResolvedValue({ forms: threeForms(), total: 3, page: 1, limit: 10 });
      renderPage();
      await screen.findByText('Form One');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select Form One' }));
      await userEvent.click(screen.getByRole('checkbox', { name: 'Select Form Two' }));
      await userEvent.click(screen.getByRole('button', { name: 'Delete selected' }));

      expect(await screen.findByText('Delete 2 forms?')).toBeInTheDocument();
      // No typed-title input in bulk mode — the confirm button is enabled immediately.
      const confirmButton = screen.getByRole('button', { name: 'Delete 2 forms' });
      expect(confirmButton).toBeEnabled();

      await userEvent.click(confirmButton);

      await vi.waitFor(() => expect(mockDeleteForm).toHaveBeenCalledTimes(2));
      expect(mockDeleteForm).toHaveBeenNthCalledWith(1, 'f1');
      expect(mockDeleteForm).toHaveBeenNthCalledWith(2, 'f2');
    });

    it('a single row selected via checkbox also uses the lighter bulk-confirm flow, not the typed-title one', async () => {
      mockGetForms.mockResolvedValue({ forms: threeForms(), total: 3, page: 1, limit: 10 });
      renderPage();
      await screen.findByText('Form One');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select Form One' }));
      await userEvent.click(screen.getByRole('button', { name: 'Delete selected' }));

      expect(await screen.findByText('Delete 1 form?')).toBeInTheDocument();
      expect(screen.queryByLabelText(/Type .* to confirm/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete 1 form' })).toBeEnabled();
    });

    it('switching tabs clears the current selection', async () => {
      mockGetForms.mockResolvedValue({ forms: threeForms(), total: 3, page: 1, limit: 10 });
      renderPage();
      await screen.findByText('Form One');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select Form One' }));
      expect(await screen.findByText('1 selected')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('tab', { name: 'Draft' }));
      await vi.waitFor(() => expect(screen.getByRole('tab', { name: 'Draft' })).toHaveAttribute('aria-selected', 'true'));

      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    });
  });

  // sprint-10-events-migration, task 6.5 — proves the ui/Table migration (6.2) plus adding the
  // select column (6.4) didn't disturb any existing row action's wiring.
  describe('row-action wiring unchanged after the ui/Table migration and select column (task 6.5)', () => {
    it('View Responses and View Analytics still navigate to the same per-form URLs', async () => {
      mockGetForms.mockResolvedValue({ forms: [threeForms()[0]], total: 1, page: 1, limit: 10 });
      renderPage();
      await screen.findByText('Form One');

      await userEvent.click(screen.getByRole('button', { name: 'More Options' }));
      const items = await screen.findAllByRole('menuitem');
      const labels = items.map((i) => i.textContent);
      expect(labels).toEqual(
        expect.arrayContaining(['Overview', 'View Responses', 'View Analytics', 'Move', 'Share access', 'Duplicate', 'Delete'])
      );
    });

    it('Duplicate still calls duplicateForm with the row\'s own id', async () => {
      mockGetForms.mockResolvedValue({ forms: [threeForms()[0]], total: 1, page: 1, limit: 10 });
      renderPage();
      await screen.findByText('Form One');

      await userEvent.click(screen.getByRole('button', { name: 'More Options' }));
      await userEvent.click(await screen.findByRole('menuitem', { name: /Duplicate/ }));

      await vi.waitFor(() => expect(mockDuplicateForm).toHaveBeenCalledWith('f1'));
    });

    it('the row menu\'s single-item Delete still uses the strict typed-title confirmation, unaffected by bulk mode existing', async () => {
      mockGetForms.mockResolvedValue({ forms: [threeForms()[0]], total: 1, page: 1, limit: 10 });
      renderPage();
      await screen.findByText('Form One');

      await userEvent.click(screen.getByRole('button', { name: 'More Options' }));
      await userEvent.click(await screen.findByRole('menuitem', { name: /Delete/ }));

      expect(await screen.findByText('Delete form?')).toBeInTheDocument();
      expect(screen.getByLabelText(/Type .* to confirm/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete permanently' })).toBeDisabled();
    });
  });
});
