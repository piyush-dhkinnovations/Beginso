import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let routeSlug = 'job-application';
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useParams: () => ({ slug: routeSlug }), useRouter: () => ({ replace, push: vi.fn() }) }));
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
    replace.mockReset();
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
    // one beside the title, one in the sticky bar on a phone: both go the same way
    const links = screen.getAllByRole('link', { name: 'Use this template' });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute('href', `/signup?next=${encodeURIComponent('/templates/apply/t1')}`);
  });

  it('sends an already-authenticated visitor straight to apply the template, no signup step', () => {
    authenticated = true;
    mockTemplates.mockReturnValue({ data: [tpl()], isLoading: false });
    render(<TemplateDetailPage />);
    for (const link of screen.getAllByRole('link', { name: 'Use this template' })) expect(link).toHaveAttribute('href', '/templates/apply/t1');
  });

  it('lists the questions inside the template, hiding the ones that were deleted, with a way to open the full preview', () => {
    mockTemplates.mockReturnValue({
      data: [tpl({ fields: [{ ...field('Full name'), required: true }, field('Email'), { ...field('Old question'), deleted: true }] })],
      isLoading: false,
    });
    render(<TemplateDetailPage />);
    expect(screen.getByRole('heading', { name: 'What is inside' })).toBeInTheDocument();
    expect(screen.getByText('Full name')).toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.queryByText('Old question')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open full preview/ })).toHaveAttribute('href', '/discover-templates/job-application/preview');
  });

  it('says how many steps it has only when there is more than one', () => {
    mockTemplates.mockReturnValue({ data: [tpl({ pages: [{ id: 'a', order: 0 }, { id: 'b', order: 1 }] })], isLoading: false });
    const { unmount } = render(<TemplateDetailPage />);
    expect(screen.getByText('2 steps')).toBeInTheDocument();
    unmount();
    mockTemplates.mockReturnValue({ data: [tpl()], isLoading: false });
    render(<TemplateDetailPage />);
    expect(screen.queryByText(/steps/)).not.toBeInTheDocument();
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

  it('opens the template that replaced an old slug, and sends the visitor on to the new address', () => {
    routeSlug = 'general-contact-form';
    mockTemplates.mockReturnValue({ data: [tpl({ _id: 'n1', slug: 'contact-us', name: 'Contact Us', replaces: ['general-contact-form'] })], isLoading: false });
    render(<TemplateDetailPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Contact Us' })).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/discover-templates/contact-us');
  });

  it('does not redirect a current slug, an id, or a slug nothing replaced', () => {
    mockTemplates.mockReturnValue({ data: [tpl({ replaces: ['old-job-application'] })], isLoading: false });
    render(<TemplateDetailPage />);
    expect(replace).not.toHaveBeenCalled();
    routeSlug = 'nothing-like-it';
    render(<TemplateDetailPage />);
    expect(screen.getByText('Template not found')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
