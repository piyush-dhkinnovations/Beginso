/**
 * Feature: a submission link that cannot be shown (QA A6-008)
 * The server answers 404 both for a submission its owner deleted and for someone else's id, so the page may not say which
 * it was. It used to say only "We could not find that submission." with no hint at all.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'abc' }) }));
const detail = vi.hoisted(() => vi.fn());
vi.mock('@/services/respondent', () => ({ respondentService: { detail: () => detail(), edit: vi.fn() } }));

import MySubmissionPage from '@/app/(user)/my-submissions/[id]/page';

describe('MySubmissionPage when the submission is not found', () => {
  it('explains the two reasons it can be missing without confirming which one applies', async () => {
    detail.mockRejectedValue({ response: { status: 404 } });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MySubmissionPage />
      </QueryClientProvider>
    );
    expect(await screen.findByText('We could not find that submission.')).toBeInTheDocument();
    expect(screen.getByText(/removed by the form's owner/)).toBeInTheDocument();
    expect(screen.getByText(/different account/)).toBeInTheDocument();
  });
});
