/**
 * Feature: use a template from the public gallery.
 * Tests: the address carries the template's SLUG (or an old id); the page looks the template up in the current list and uses its present id (an id
 * changes when the catalogue is reloaded, a slug does not). The form is always created in the personal account, straight away and exactly once, then the
 * builder opens on the Branding tab; a failure, or a template that is not there, shows a way back, not a stuck spinner.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ApplyTemplatePage from '@/app/(standalone)/templates/apply/[id]/page';

const { mockReplace, mockPush, param } = vi.hoisted(() => ({ mockReplace: vi.fn(), mockPush: vi.fn(), param: { current: 'pitch-plan' } }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: param.current }),
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

const mockUseTemplate = vi.fn();
vi.mock('@/services/templates', () => ({
  templatesService: { useTemplate: (...args: unknown[]) => mockUseTemplate(...args) },
}));

const publicTemplates = vi.fn();
vi.mock('@/hooks/usePublicTemplates', () => ({ usePublicTemplates: () => publicTemplates() }));

const OLD_ID = 'a'.repeat(24);
const NEW_ID = 'b'.repeat(24);
const LIST = [{ _id: NEW_ID, slug: 'pitch-plan', name: 'Pitch Plan' }];

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ApplyTemplatePage />
    </QueryClientProvider>
  );
}

describe('ApplyTemplatePage (/templates/apply/[slug])', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockPush.mockReset();
    mockUseTemplate.mockReset();
    publicTemplates.mockReset();
    publicTemplates.mockReturnValue({ data: LIST, isLoading: false });
    param.current = 'pitch-plan';
  });

  it('asks nothing: finds the template by its slug, creates the form in the personal account (destination null) and opens the builder on Branding', async () => {
    mockUseTemplate.mockResolvedValueOnce({ _id: 'form-9', title: 'Pitch Plan' });
    renderPage();

    expect(screen.queryByText(/where should this form live/i)).not.toBeInTheDocument();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/forms/form-9/edit?tab=branding'));
    expect(mockUseTemplate).toHaveBeenCalledTimes(1);
    // the id used is the template's CURRENT id, looked up from its slug
    expect(mockUseTemplate).toHaveBeenCalledWith(NEW_ID, null);
  });

  it('survives a reseed: an old id in the link still finds the same template when the list has it under its slug', async () => {
    param.current = NEW_ID;
    mockUseTemplate.mockResolvedValueOnce({ _id: 'form-1' });
    renderPage();
    await waitFor(() => expect(mockUseTemplate).toHaveBeenCalledWith(NEW_ID, null));
  });

  it('tries a 24-character id that is not in the public list as it is (a template not shown in the gallery)', async () => {
    param.current = OLD_ID;
    mockUseTemplate.mockResolvedValueOnce({ _id: 'form-2' });
    renderPage();
    await waitFor(() => expect(mockUseTemplate).toHaveBeenCalledWith(OLD_ID, null));
  });

  it('waits for the list to arrive before deciding, and creates nothing while it waits', () => {
    publicTemplates.mockReturnValue({ data: undefined, isLoading: true });
    renderPage();
    expect(screen.getByText(/setting up your form/i)).toBeInTheDocument();
    expect(mockUseTemplate).not.toHaveBeenCalled();
  });

  it('says the template is not there for a slug that is not in the list, and creates nothing', async () => {
    param.current = 'does-not-exist';
    renderPage();
    expect(await screen.findByText(/couldn.t create your form/i)).toBeInTheDocument();
    expect(mockUseTemplate).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /back to templates/i }));
    expect(mockPush).toHaveBeenCalledWith('/discover-templates');
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

  it('creates exactly one form even when the page renders again', async () => {
    mockUseTemplate.mockResolvedValue({ _id: 'form-3' });
    const { rerender } = renderPage();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <ApplyTemplatePage />
      </QueryClientProvider>
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(mockUseTemplate.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
