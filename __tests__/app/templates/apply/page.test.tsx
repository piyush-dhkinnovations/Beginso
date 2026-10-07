/**
 * .kiro/specs/public-template-gallery — Requirement 3 (apply handoff) and Requirement 7
 * (explicit Personal/Workspace destination). One call to POST /api/templates/:id/use carrying
 * the destination, then a redirect into the builder on the Branding tab.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ApplyTemplatePage from '@/app/(standalone)/templates/apply/[id]/page';

const { mockReplace, mockPush } = vi.hoisted(() => ({ mockReplace: vi.fn(), mockPush: vi.fn() }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'tpl-1' }),
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

const mockUseTemplate = vi.fn();
vi.mock('@/services/templates', () => ({
  templatesService: { useTemplate: (...args: unknown[]) => mockUseTemplate(...args) },
}));

vi.mock('@/hooks/useWorkspaceDestinations', () => ({
  useWorkspaceList: () => ({
    data: [{ id: 'ws-1', name: 'Acme', slug: 'acme', role: 'owner' }],
    isLoading: false,
  }),
}));
vi.mock('@/components/workspaces/CreateWorkspaceModal', () => ({ CreateWorkspaceModal: () => null }));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ApplyTemplatePage />
    </QueryClientProvider>
  );
}

describe('ApplyTemplatePage (/templates/apply/[id])', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockPush.mockReset();
    mockUseTemplate.mockReset();
  });

  it('asks where the form should live and creates nothing until the user confirms', () => {
    renderPage();

    expect(screen.getByText(/where should this form live/i)).toBeInTheDocument();
    expect(mockUseTemplate).not.toHaveBeenCalled();
  });

  it('personal: sends destinationWorkspaceId null, then opens the builder on the Branding tab with no ws hint', async () => {
    mockUseTemplate.mockResolvedValueOnce({ _id: 'form-9', title: 'Pitch Plan' });
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /use this template/i }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/forms/form-9/edit?tab=branding'));
    expect(mockUseTemplate).toHaveBeenCalledWith('tpl-1', null);
  });

  it('workspace: sends that workspace id and carries its slug as the ?ws= hint', async () => {
    mockUseTemplate.mockResolvedValueOnce({ _id: 'form-10', title: 'Pitch Plan' });
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /^workspace/i }));
    await userEvent.selectOptions(screen.getByLabelText(/which workspace/i), 'ws-1');
    await userEvent.click(screen.getByRole('button', { name: /use this template/i }));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/forms/form-10/edit?ws=acme&tab=branding')
    );
    expect(mockUseTemplate).toHaveBeenCalledWith('tpl-1', 'ws-1');
  });

  it('a failed apply shows an error with a way back to the gallery, not a stuck spinner', async () => {
    mockUseTemplate.mockRejectedValueOnce(new Error('boom'));
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /use this template/i }));

    expect(await screen.findByText(/couldn.t create your form/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /back to templates/i }));
    expect(mockPush).toHaveBeenCalledWith('/discover-templates');
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
