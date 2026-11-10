import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let routeSlug = 'job-application';
vi.mock('next/navigation', () => ({ useParams: () => ({ slug: routeSlug }) }));
vi.mock('@/components/landing/Navbar', () => ({ default: () => null }));
vi.mock('@/components/landing/Footer', () => ({ default: () => null }));
vi.mock('@/components/templates/TemplatePreviewFrame', () => ({
  TemplatePreviewFrame: ({ slug, device }: { slug: string; device: string }) => <div>preview of {slug} at {device}</div>,
}));

const mockTemplates = vi.fn();
vi.mock('@/hooks/usePublicTemplates', () => ({ usePublicTemplates: () => mockTemplates() }));
let authenticated = false;
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: authenticated }) }));

import TemplateDetailPage from '@/app/discover-templates/[slug]/page';

const field = (label: string) => ({ fieldId: label, pageId: 'p', type: 'short_text', label, required: false, deleted: false, order: 0 });
const tpl = (over: Record<string, unknown> = {}) => ({
  _id: 't1', slug: 'job-application', name: 'Job Application', description: 'Collect CVs', category: 'HR',
  fields: [field('Full name'), field('Email')], settings: {}, isActive: true, ...over,
});

describe('TemplateDetailPage', () => {
  beforeEach(() => {
    mockTemplates.mockReset();
    authenticated = false;
    routeSlug = 'job-application';
  });

  it('shows a loading state while the catalog is still fetching', () => {
    mockTemplates.mockReturnValue({ data: undefined, isLoading: true });
    render(<TemplateDetailPage />);
    expect(screen.getByText('Loading template…')).toBeInTheDocument();
  });

  it('shows "not found" for a slug that matches no template', () => {
    mockTemplates.mockReturnValue({ data: [tpl({ slug: 'something-else' })], isLoading: false });
    render(<TemplateDetailPage />);
    expect(screen.getByRole('heading', { name: 'Template not found' })).toBeInTheDocument();
  });

  it('finds the template by its raw id too, not only its slug (an already-shared link)', () => {
    routeSlug = 't1';
    mockTemplates.mockReturnValue({ data: [tpl()], isLoading: false });
    render(<TemplateDetailPage />);
    expect(screen.getByRole('heading', { name: 'Job Application', level: 1 })).toBeInTheDocument();
  });

  it('shows the real question count, the description, and a device-switchable preview, both on screen together', () => {
    mockTemplates.mockReturnValue({ data: [tpl()], isLoading: false });
    render(<TemplateDetailPage />);
    expect(screen.getByRole('heading', { name: 'Job Application', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Collect CVs')).toBeInTheDocument();
    expect(screen.getByText('2 questions')).toBeInTheDocument();
    expect(screen.getByText('preview of job-application at desktop')).toBeInTheDocument();
  });

  it('switches the preview device on click', async () => {
    mockTemplates.mockReturnValue({ data: [tpl()], isLoading: false });
    render(<TemplateDetailPage />);
    await userEvent.click(screen.getByRole('tab', { name: 'Mobile' }));
    expect(screen.getByText('preview of job-application at mobile')).toBeInTheDocument();
  });

  it('sends a logged-out visitor to sign up first, carrying the template along in `next`', () => {
    mockTemplates.mockReturnValue({ data: [tpl()], isLoading: false });
    render(<TemplateDetailPage />);
    expect(screen.getByRole('link', { name: 'Use this template' })).toHaveAttribute(
      'href',
      `/signup?next=${encodeURIComponent('/templates/apply/t1')}`
    );
  });

  it('sends an already-authenticated visitor straight to apply the template, no signup step', () => {
    authenticated = true;
    mockTemplates.mockReturnValue({ data: [tpl()], isLoading: false });
    render(<TemplateDetailPage />);
    expect(screen.getByRole('link', { name: 'Use this template' })).toHaveAttribute('href', '/templates/apply/t1');
  });

  it('suggests other templates in the same category, excluding the one being viewed', () => {
    mockTemplates.mockReturnValue({
      data: [tpl(), tpl({ _id: 't2', slug: 'exit-interview', name: 'Exit Interview', category: 'HR' }), tpl({ _id: 't3', slug: 'event-registration', name: 'Event Registration', category: 'Events' })],
      isLoading: false,
    });
    render(<TemplateDetailPage />);
    expect(screen.getByText('More in HR')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Exit Interview/ })).toHaveAttribute('href', '/discover-templates/exit-interview');
    expect(screen.queryByText('Event Registration')).not.toBeInTheDocument();
    expect(screen.queryByText('More in HR', { exact: false })).toBeTruthy();
  });

  it('shows no "More in" section when nothing else shares the category', () => {
    mockTemplates.mockReturnValue({ data: [tpl()], isLoading: false });
    render(<TemplateDetailPage />);
    expect(screen.queryByText(/More in/)).not.toBeInTheDocument();
  });
});
