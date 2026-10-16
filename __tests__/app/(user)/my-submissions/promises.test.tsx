/**
 * Feature: My Submissions copy (QA A6-006)
 * The page said it listed "every form you filled in while signed in", but only forms that require sign-in (and tracked
 * forms once claimed) are linked to an account. An open form is anonymous even when you happen to be signed in.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mine = vi.hoisted(() => vi.fn());
vi.mock('@/services/respondent', () => ({ respondentService: { mine: () => mine() } }));

import MySubmissionsPage from '@/app/(user)/my-submissions/page';

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MySubmissionsPage />
    </QueryClientProvider>
  );

describe('My Submissions does not promise more than it lists', () => {
  beforeEach(() => mine.mockReset());

  it('says which responses are listed instead of "every form you filled in while signed in"', async () => {
    mine.mockResolvedValue([]);
    renderPage();
    const text = document.body.textContent ?? '';
    expect(await screen.findByText(/You have not submitted anything yet/)).toBeInTheDocument();
    expect(text).not.toMatch(/Every form you filled in/);
    expect(text).toMatch(/forms that asked you to sign in/);
  });

  it('the empty state explains that a form anyone can fill in is not linked to the account', async () => {
    mine.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/not linked to your account/)).toBeInTheDocument();
  });
});
