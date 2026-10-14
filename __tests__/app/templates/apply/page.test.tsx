/**
 * Feature: use a template from the public gallery.
 * Tests: the form is always created in the personal account, straight away and exactly once (no Personal/Workspace
 * question), then the builder opens on the Branding tab; a failure shows a way back, not a stuck spinner.
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

  it('asks nothing: creates the form in the personal account (destination null) and opens the builder on Branding', async () => {
    mockUseTemplate.mockResolvedValueOnce({ _id: 'form-9', title: 'Pitch Plan' });
    renderPage();

    expect(screen.queryByText(/where should this form live/i)).not.toBeInTheDocument();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/forms/form-9/edit?tab=branding'));
    expect(mockUseTemplate).toHaveBeenCalledTimes(1);
    expect(mockUseTemplate).toHaveBeenCalledWith('tpl-1', null);
  });

  it('shows a progress message while the form is being created', () => {
    mockUseTemplate.mockReturnValueOnce(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/setting up your form/i)).toBeInTheDocument();
  });

  it('a failed apply shows an error with a way back to the gallery, not a stuck spinner', async () => {
    mockUseTemplate.mockRejectedValueOnce(new Error('boom'));
    renderPage();

    expect(await screen.findByText(/couldn.t create your form/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /back to templates/i }));
    expect(mockPush).toHaveBeenCalledWith('/discover-templates');
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
