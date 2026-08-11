/** Tests the standalone full-page response route opened by the drawer expand action. */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ResponseDetailPage from '@/app/(user)/responses/[id]/page';

const mockPush = vi.fn();
const mockBack = vi.fn();
const mockReplace = vi.fn();
let mockSearchParamsValue = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'resp-1' }),
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
  useSearchParams: () => mockSearchParamsValue,
}));

const mockGetFormById = vi.fn();
vi.mock('@/services/forms', () => ({
  formsService: { getFormById: (...args: unknown[]) => mockGetFormById(...args) },
}));

vi.mock('@/components/responses/ResponseDrawer', () => ({
  ResponseDrawer: ({ responseId, displayMode, formTitle, fileFieldLabels, collapseHref, onClose }: {
    responseId: string;
    displayMode: string;
    formTitle?: string;
    fileFieldLabels: string[];
    collapseHref?: string;
    onClose: () => void;
  }) => (
    <div>
      <span>{`${displayMode}:${responseId}`}</span>
      <span>{formTitle}</span>
      <span>{fileFieldLabels.join(',')}</span>
      <a href={collapseHref}>Collapse</a>
      <button onClick={onClose}>Back</button>
    </div>
  ),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ResponseDetailPage />
    </QueryClientProvider>
  );
}

describe('/responses/[id] full-page view', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
    mockReplace.mockReset();
    mockGetFormById.mockReset();
    mockSearchParamsValue = new URLSearchParams();
  });

  it('renders the response in page mode', () => {
    renderPage();
    expect(screen.getByText('page:resp-1')).toBeInTheDocument();
  });

  it('loads the form title and file-upload field labels', async () => {
    mockSearchParamsValue = new URLSearchParams('formId=form-1');
    mockGetFormById.mockResolvedValue({
      title: 'Event registration',
      fields: [
        { type: 'file_upload', label: 'Portfolio', deleted: false, order: 2 },
        { type: 'short_text', label: 'Name', deleted: false, order: 1 },
      ],
    });
    renderPage();

    expect(await screen.findByText('Event registration')).toBeInTheDocument();
    expect(screen.getByText('Portfolio')).toBeInTheDocument();
    expect(mockGetFormById).toHaveBeenCalledWith('form-1');
  });

  it('links collapse to the exact validated drawer URL that opened the full-page view', () => {
    mockSearchParamsValue = new URLSearchParams({
      formId: 'form-1',
      returnTo: '/forms/form-1/responses?page=3&status=new&responseId=resp-1',
    });
    mockGetFormById.mockResolvedValue({ title: 'Form', fields: [] });
    renderPage();

    expect(screen.getByRole('link', { name: 'Collapse' })).toHaveAttribute(
      'href',
      '/forms/form-1/responses?page=3&status=new&responseId=resp-1'
    );
  });
});
