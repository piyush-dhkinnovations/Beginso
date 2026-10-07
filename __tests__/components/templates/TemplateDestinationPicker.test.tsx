import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateDestinationPicker } from '@/components/templates/TemplateDestinationPicker';

const { mockWorkspaces } = vi.hoisted(() => ({
  mockWorkspaces: { current: { data: [] as unknown[], isLoading: false } },
}));
vi.mock('@/hooks/useWorkspaceDestinations', () => ({
  useWorkspaceList: () => mockWorkspaces.current,
}));

// The real modal pulls in react-query/router/form deps; the picker only cares that it opens and
// hands back a created workspace via onCreated.
vi.mock('@/components/workspaces/CreateWorkspaceModal', () => ({
  CreateWorkspaceModal: ({
    isOpen,
    onCreated,
  }: {
    isOpen: boolean;
    onCreated?: (w: { id: string; name: string; slug: string }) => void;
  }) =>
    isOpen ? (
      <button type="button" onClick={() => onCreated?.({ id: 'ws-new', name: 'New WS', slug: 'new-ws' })}>
        finish create
      </button>
    ) : null,
}));

const WS_OWNER = { id: 'ws-1', name: 'Acme', slug: 'acme', role: 'owner' };
const WS_MEMBER = { id: 'ws-2', name: 'Beta', slug: 'beta', role: 'member' };
const WS_VIEWER = { id: 'ws-3', name: 'Read Only Co', slug: 'read-only', role: 'viewer' };

describe('TemplateDestinationPicker', () => {
  beforeEach(() => {
    mockWorkspaces.current = { data: [], isLoading: false };
  });

  it('defaults to Personal space and confirms it without any workspace', async () => {
    const onConfirm = vi.fn();
    render(<TemplateDestinationPicker onConfirm={onConfirm} isSubmitting={false} />);

    expect(screen.getByRole('button', { name: /personal space/i })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: /use this template/i }));

    expect(onConfirm).toHaveBeenCalledWith({ type: 'personal' });
  });

  it('with no workspaces, choosing Workspace shows a create prompt instead of an empty dropdown', async () => {
    render(<TemplateDestinationPicker onConfirm={vi.fn()} isSubmitting={false} />);

    await userEvent.click(screen.getByRole('button', { name: /^workspace/i }));

    expect(screen.getByText(/don.t have a workspace yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create a workspace/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/which workspace/i)).not.toBeInTheDocument();
  });

  it('cannot confirm a Workspace destination until a specific workspace is picked', async () => {
    mockWorkspaces.current = { data: [WS_OWNER], isLoading: false };
    const onConfirm = vi.fn();
    render(<TemplateDestinationPicker onConfirm={onConfirm} isSubmitting={false} />);

    await userEvent.click(screen.getByRole('button', { name: /^workspace/i }));
    const confirm = screen.getByRole('button', { name: /use this template/i });
    expect(confirm).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText(/which workspace/i), 'ws-1');
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);

    expect(onConfirm).toHaveBeenCalledWith({ type: 'workspace', workspaceId: 'ws-1' }, 'acme');
  });

  it('only lists workspaces where the user can create forms (a Reviewer/viewer cannot)', async () => {
    mockWorkspaces.current = { data: [WS_OWNER, WS_MEMBER, WS_VIEWER], isLoading: false };
    render(<TemplateDestinationPicker onConfirm={vi.fn()} isSubmitting={false} />);

    await userEvent.click(screen.getByRole('button', { name: /^workspace/i }));

    expect(screen.getByRole('option', { name: 'Acme' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Beta' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Read Only Co' })).not.toBeInTheDocument();
  });

  it('a workspace created from the prompt becomes the selected destination', async () => {
    const onConfirm = vi.fn();
    render(<TemplateDestinationPicker onConfirm={onConfirm} isSubmitting={false} />);

    await userEvent.click(screen.getByRole('button', { name: /^workspace/i }));
    await userEvent.click(screen.getByRole('button', { name: /create a workspace/i }));
    await userEvent.click(screen.getByRole('button', { name: /finish create/i }));

    expect(screen.getByRole('button', { name: /use this template/i })).toBeEnabled();
  });

  it('shows the plain-language consequence of each choice', () => {
    render(<TemplateDestinationPicker onConfirm={vi.fn()} isSubmitting={false} />);

    // Each consequence appears on its card and again in the footer note.
    expect(screen.getAllByText(/only visible to you|visible only to you/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/visible to everyone in that workspace/i).length).toBeGreaterThan(0);
  });
});
