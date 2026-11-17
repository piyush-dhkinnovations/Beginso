import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TemplateGalleryCard } from '@/components/templates/TemplateGalleryCard';
import type { GalleryCard } from '@/lib/templateGallery';

// The drawn picture needs the full template list: not under test here, so it stays a placeholder.
vi.mock('@/hooks/usePublicTemplates', () => ({ usePublicTemplates: () => ({ data: undefined }) }));

const card = (over: Partial<GalleryCard> = {}): GalleryCard => ({
  slug: 'job-application',
  name: 'Job Application',
  description: 'Collect CVs',
  category: 'HR & Hiring',
  tags: [],
  fieldCount: 3,
  estimatedMinutes: 2,
  featured: false,
  sortOrder: 1,
  layout: 'classic',
  thumbnail: null,
  ...over,
});

describe('TemplateGalleryCard', () => {
  it('makes the whole card a link to the template page, through the name', () => {
    render(<TemplateGalleryCard card={card()} signedIn={false} />);
    const name = screen.getByRole('link', { name: 'Job Application' });
    expect(name).toHaveAttribute('href', '/discover-templates/job-application');
    // the link is stretched over the card (a pseudo-element covers it), so a click anywhere opens the page
    expect(name.className).toMatch(/after:absolute/);
    expect(name.className).toMatch(/after:inset-0/);
  });

  it('shows the category, the name, one line of description, the question count and about how many minutes', () => {
    render(<TemplateGalleryCard card={card()} signedIn={false} />);
    expect(screen.getByText('HR & Hiring')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Job Application' })).toBeInTheDocument();
    const description = screen.getByText('Collect CVs');
    expect(description.className).toMatch(/line-clamp-2/);
    expect(screen.getByText('3 questions')).toBeInTheDocument();
    expect(screen.getByText('about 2 minutes')).toBeInTheDocument();
  });

  it('uses the singular for one question and one minute', () => {
    render(<TemplateGalleryCard card={card({ fieldCount: 1, estimatedMinutes: 1 })} signedIn={false} />);
    expect(screen.getByText('1 question')).toBeInTheDocument();
    expect(screen.getByText('about 1 minute')).toBeInTheDocument();
  });

  it('falls back to a default description when it is empty', () => {
    render(<TemplateGalleryCard card={card({ description: '' })} signedIn={false} />);
    expect(screen.getByText('A ready-made starting point you can customize.')).toBeInTheDocument();
  });

  it('has a Preview button and a Use template button, shown on hover and focus and always on a touch screen', () => {
    render(<TemplateGalleryCard card={card()} signedIn={false} />);
    const preview = screen.getByRole('link', { name: 'Preview the Job Application template' });
    const use = screen.getByRole('link', { name: 'Use the Job Application template' });
    expect(preview).toHaveAttribute('href', '/discover-templates/job-application');
    const wrapper = use.parentElement!;
    expect(wrapper.className).toMatch(/opacity-0/);
    expect(wrapper.className).toMatch(/group-hover:opacity-100/);
    expect(wrapper.className).toMatch(/group-focus-within:opacity-100/);
    expect(wrapper.className).toMatch(/\[@media\(hover:none\)\]:opacity-100/);
    // tap targets of at least 44 px
    expect(preview.className).toMatch(/min-h-11/);
    expect(use.className).toMatch(/min-h-11/);
  });

  it('sends a signed-out visitor through sign-up first, carrying the slug', () => {
    render(<TemplateGalleryCard card={card()} signedIn={false} />);
    expect(screen.getByRole('link', { name: 'Use the Job Application template' })).toHaveAttribute('href', `/signup?next=${encodeURIComponent('/templates/apply/job-application')}`);
  });

  it('sends a signed-in visitor straight to apply the template', () => {
    render(<TemplateGalleryCard card={card()} signedIn />);
    expect(screen.getByRole('link', { name: 'Use the Job Application template' })).toHaveAttribute('href', '/templates/apply/job-application');
  });

  it('shows a ready-made picture, with its alt text, when the template has one', () => {
    render(<TemplateGalleryCard card={card({ thumbnail: '/template-thumbs/job-application.jpg' })} signedIn={false} />);
    const img = screen.getByRole('img', { name: 'Preview of the Job Application form' });
    expect(img).toHaveAttribute('src', '/template-thumbs/job-application.jpg');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('keeps every card the same height: the picture has one shape and the description is cut', () => {
    const { container } = render(<TemplateGalleryCard card={card({ description: 'x '.repeat(300) })} signedIn={false} />);
    expect(container.firstElementChild?.className).toMatch(/h-full/);
    expect(container.firstElementChild?.className).toMatch(/flex-col/);
  });
});
