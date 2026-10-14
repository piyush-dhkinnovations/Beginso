/**
 * Feature: public form thank-you page
 * Tests: the redirect guard, the form-coloured animated check, the chip with the form name, the start-over link (embed options
 * carried), and the Beginso footer (hidden inside an embed).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const redirect = vi.hoisted(() => vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
}));
vi.mock('next/navigation', () => ({ redirect }));
const getFormSchema = vi.hoisted(() => vi.fn());
vi.mock('@/services/publicForm', () => ({ publicFormService: { getFormSchema } }));
vi.mock('@/components/public-form/FormUnavailable', () => ({ FormUnavailable: () => <div>unavailable</div> }));

import SuccessPage from '@/app/f/[slug]/success/page';

async function page(search: Record<string, string> = { title: 'Event%20Registration' }) {
  const ui = await SuccessPage({ params: Promise.resolve({ slug: 'abc' }), searchParams: Promise.resolve(search) });
  return render(ui);
}

describe('public form success page', () => {
  beforeEach(() => {
    redirect.mockClear();
    getFormSchema.mockReset().mockResolvedValue({ schema: { branding: { primaryColor: '#7c3aed' } } });
  });

  it('sends a bare visit (no ?title=) back to the form instead of claiming success', async () => {
    await expect(page({})).rejects.toThrow('redirect:/f/abc');
  });

  it('thanks the respondent, names the form and shows the default or the custom message', async () => {
    const { unmount } = await page();
    expect(screen.getByRole('heading', { name: 'Thank you!' })).toBeInTheDocument();
    expect(screen.getByText('Your response has been submitted successfully.')).toBeInTheDocument();
    expect(screen.getByText('Event Registration')).toBeInTheDocument();
    unmount();
    await page({ title: 'T', message: 'We%20will%20call%20you' });
    expect(screen.getByText('We will call you')).toBeInTheDocument();
  });

  it("tints the check with the form's own colour, and falls back to blue for a missing or invalid one", async () => {
    const { container, unmount } = await page();
    expect(container.querySelector('.aa-draw')).toBeInTheDocument();
    expect(container.innerHTML).toContain('background-color: rgb(124, 58, 237)');
    unmount();
    getFormSchema.mockResolvedValue({ schema: { branding: { primaryColor: 'red; evil' } } });
    const second = await page();
    expect(second.container.innerHTML).not.toContain('evil');
    expect(second.container.innerHTML).toContain('background-color: rgb(29, 78, 216)');
  });

  it('offers another response, carrying the embed options, and hides the Beginso footer inside an embed', async () => {
    await page({ title: 'T', embed: '1', theme: 'dark' });
    expect(screen.getByRole('link', { name: 'Submit another response' })).toHaveAttribute('href', '/f/abc?embed=1&theme=dark');
    expect(screen.queryByRole('link', { name: 'Create your own form' })).not.toBeInTheDocument();
  });

  it('shows the footer outside an embed', async () => {
    await page();
    expect(screen.getByRole('link', { name: 'Create your own form' })).toHaveAttribute('href', '/signup');
  });

  it('shows the unavailable page for a slug that does not exist, but still thanks when the lookup itself fails', async () => {
    getFormSchema.mockResolvedValueOnce({ schema: null });
    const { unmount } = await page();
    expect(screen.getByText('unavailable')).toBeInTheDocument();
    unmount();
    getFormSchema.mockRejectedValueOnce(new Error('down'));
    await page();
    expect(screen.getByRole('heading', { name: 'Thank you!' })).toBeInTheDocument();
  });
});
