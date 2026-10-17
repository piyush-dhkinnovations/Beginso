/**
 * Feature: public form page, unavailable states (QA A5-001)
 * Tests: closed, closing date passed, response limit reached, draft and nonexistent forms each get the right screen, and
 * a link that resolves to nothing goes through notFound() so the response is a real HTTP 404.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  })
);
vi.mock('next/navigation', () => ({ notFound, redirect: vi.fn() }));
const getFormSchema = vi.hoisted(() => vi.fn());
vi.mock('@/services/publicForm', () => ({ publicFormService: { getFormSchema } }));
vi.mock('@/components/public-form/PublicFormShell', () => ({ PublicFormShell: () => <div>the form</div> }));

import PublicFormPage, { generateMetadata } from '@/app/f/[slug]/page';
import PublicFormNotFound from '@/app/f/[slug]/not-found';

const props = { params: Promise.resolve({ slug: 'abc' }), searchParams: Promise.resolve({}) };
const open = (settings: Record<string, unknown> = {}) => ({
  schema: { title: 'Contact', pages: [{ id: 'p', order: 0 }], fields: [], branding: {}, settings: { honeypotEnabled: true, ...settings } },
});

beforeEach(() => {
  notFound.mockClear();
  getFormSchema.mockReset();
});

describe('public form page: the five states', () => {
  it.each([
    ['closed', 'This form is closed'],
    ['closeDate', "This form's closing date has passed"],
    ['limit', 'This form has reached its response limit'],
  ] as const)('%s shows its own message', async (unavailable, heading) => {
    getFormSchema.mockResolvedValue({ schema: null, unavailable });
    render(await PublicFormPage(props));
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('a closing date that has passed (caught by the page, if the server had not yet said so) says so', async () => {
    getFormSchema.mockResolvedValue(open({ closeDate: '2020-01-01T00:00:00.000Z' }));
    render(await PublicFormPage(props));
    expect(screen.getByRole('heading', { name: "This form's closing date has passed" })).toBeInTheDocument();
  });

  it('a draft and a nonexistent link both resolve to nothing and are handed to notFound() (a real 404)', async () => {
    getFormSchema.mockResolvedValue({ schema: null }); // the backend answers both with the same 404
    await expect(PublicFormPage(props)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('an open form renders the form', async () => {
    getFormSchema.mockResolvedValue(open());
    render(await PublicFormPage(props));
    expect(screen.getByText('the form')).toBeInTheDocument();
  });

  it('the not-found screen keeps the one "Form not found" wording', () => {
    render(<PublicFormNotFound />);
    expect(screen.getByRole('heading', { name: 'Form not found' })).toBeInTheDocument();
  });
});

describe('public form page: the tab title and indexing', () => {
  it('a closed form has a descriptive title and is not indexed', async () => {
    getFormSchema.mockResolvedValue({ schema: null, unavailable: 'limit' });
    const meta = await generateMetadata(props);
    expect(meta.title).toBe('This form has reached its response limit');
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  // Closed pages answer 200 on purpose (a Next.js page cannot answer 410); noindex is what keeps them out of search (QA D4-001).
  it.each(['closed', 'closeDate', 'limit'] as const)('every closed state (%s) is noindex', async (reason) => {
    getFormSchema.mockResolvedValue({ schema: null, unavailable: reason });
    expect((await generateMetadata(props)).robots).toEqual({ index: false, follow: false });
  });

  it('a closing date the page catches itself is noindex too, with the closing-date title', async () => {
    getFormSchema.mockResolvedValue(open({ closeDate: '2020-01-01T00:00:00.000Z' }));
    const meta = await generateMetadata(props);
    expect(meta.title).toBe("This form's closing date has passed");
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it('a draft or unknown link is a real 404, not a 200 page', async () => {
    getFormSchema.mockResolvedValue({ schema: null });
    await PublicFormPage(props).catch(() => undefined);
    expect(notFound).toHaveBeenCalled();
  });

  it('an open form keeps its own title', async () => {
    getFormSchema.mockResolvedValue(open());
    expect((await generateMetadata(props)).title).toBe('Contact');
  });
});
