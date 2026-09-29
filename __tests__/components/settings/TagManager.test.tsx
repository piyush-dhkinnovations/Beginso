/**
 * __tests__/components/settings/TagManager.test.tsx
 * sprint-12-inbox-collaboration, requirements.md §7.7, task 2.5.
 * "Unsaved edit survives a tab switch" (tasks.md 2.5's Done line): TagManager is a real RHF form,
 * so it must report dirty state up (`onDirtyChange`) the same way ProfileTab/WorkspaceTab do —
 * that's what lets SettingsPage's `visitedTabs`/CSS-`hidden` mechanism (already covered by
 * `unsavedTabState.property.test.tsx`'s generic property) actually preserve it for this tab.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TagManager } from '@/components/settings/TagManager';

vi.mock('@/services/tags', () => ({
  tagsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    merge: vi.fn(),
  },
}));

const toastMock = vi.fn();
vi.mock('@/components/common/Toast', () => ({ useToast: () => ({ toast: toastMock }) }));

import { tagsService } from '@/services/tags';

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('TagManager', () => {
  beforeEach(() => {
    vi.mocked(tagsService.list).mockResolvedValue([
      { id: 't1', name: 'Hot lead', colour: 'success', usageCount: 3 },
    ]);
    toastMock.mockReset();
  });

  it('renders the existing tag library with usage count', async () => {
    renderWithClient(<TagManager scope="acme" />);
    await waitFor(() => expect(screen.getByText('Hot lead')).toBeInTheDocument());
    expect(screen.getByText('3 responses')).toBeInTheDocument();
  });

  it('reports dirty state as the create form is typed into (unsaved-edit survival contract)', async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    renderWithClient(<TagManager scope="acme" onDirtyChange={onDirtyChange} />);
    await waitFor(() => expect(screen.getByText('Hot lead')).toBeInTheDocument());

    await user.type(screen.getByLabelText('New tag'), 'Follow up');
    await waitFor(() => expect(onDirtyChange).toHaveBeenCalledWith(true));
  });

  it('shows an empty state instead of crashing when no workspace scope is available', () => {
    renderWithClient(<TagManager scope={undefined} />);
    expect(screen.getByText('No workspace to manage tags for')).toBeInTheDocument();
  });

  it('creating a tag calls tagsService.create and resets the form', async () => {
    const user = userEvent.setup();
    vi.mocked(tagsService.create).mockResolvedValue({ id: 't2', name: 'Follow up', colour: 'neutral' });
    renderWithClient(<TagManager scope="acme" />);
    await waitFor(() => expect(screen.getByText('Hot lead')).toBeInTheDocument());

    await user.type(screen.getByLabelText('New tag'), 'Follow up');
    await user.click(screen.getByRole('button', { name: 'Add tag' }));

    await waitFor(() => expect(tagsService.create).toHaveBeenCalledWith('acme', { name: 'Follow up', colour: 'neutral' }));
  });

  it('delete shows the usage count before confirming', async () => {
    const user = userEvent.setup();
    renderWithClient(<TagManager scope="acme" />);
    await waitFor(() => expect(screen.getByText('Hot lead')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText(/used by 3 responses/i)).toBeInTheDocument();
  });
});
