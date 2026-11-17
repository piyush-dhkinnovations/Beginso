import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { DiscoverTemplates, GalleryIntro } from '@/components/templates/DiscoverTemplates';
import type { GalleryCard, GalleryData } from '@/lib/templateGallery';
import type { Template } from '@/types/form';

const { mockReplace, mockRefresh } = vi.hoisted(() => ({ mockReplace: vi.fn(), mockRefresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }) }));

let authenticated = false;
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: authenticated }) }));

const publicTemplates = vi.fn();
vi.mock('@/hooks/usePublicTemplates', () => ({ usePublicTemplates: (opts?: unknown) => publicTemplates(opts) }));

const card = (slug: string, name: string, category: string, over: Partial<GalleryCard> = {}): GalleryCard => ({
  slug, name, description: `${name} description.`, category, tags: [], fieldCount: 4, estimatedMinutes: 2, featured: false, sortOrder: 1, layout: 'classic', thumbnail: null, ...over,
});

const DATA: GalleryData = {
  cards: [
    card('job-application', 'Job Application', 'HR & Hiring', { featured: true }),
    card('event-registration', 'Event Registration', 'Events & RSVPs', { featured: true }),
    card('exit-interview', 'Exit Interview', 'HR & Hiring'),
    card('wedding-rsvp', 'Wedding RSVP', 'Events & RSVPs', { description: 'A warm RSVP for a wedding.' }),
    card('patient-intake', 'Patient Intake Form', 'Healthcare'),
  ],
  groups: [
    { name: 'HR & Hiring', count: 2 },
    { name: 'Events & RSVPs', count: 2 },
    { name: 'Healthcare', count: 1 },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  authenticated = false;
  publicTemplates.mockReturnValue({ data: undefined, isLoading: false, error: null });
});

const cardNames = () => screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent);

describe('the gallery: a server list that leaves templates out', () => {
  it('shows every group, not only the two the server counted, and the counts add up to All', () => {
    const partial: GalleryData = {
      cards: [
        card('a', 'Job Application', 'HR'),
        card('b', 'Exit Interview', 'HR'),
        card('c', 'Wedding RSVP', 'Events'),
        card('d', 'Course Signup', 'Education'),
        card('e', 'Tour Booking', 'Real Estate'),
      ],
      groups: [{ name: 'Education', count: 1 }, { name: 'Real Estate', count: 1 }],
    };
    render(<DiscoverTemplates initial={partial} />);
    const nav = screen.getByRole('navigation', { name: 'Template categories' });
    const names = within(nav).getAllByRole('button').map((b) => b.textContent ?? '');
    expect(names.some((n) => n.startsWith('HR'))).toBe(true);
    expect(names.some((n) => n.startsWith('Events'))).toBe(true);
    expect(names.some((n) => n.startsWith('Education'))).toBe(true);
    expect(names.some((n) => n.startsWith('Real Estate'))).toBe(true);
    expect(names[0]).toContain('5');
  });
});

describe('the gallery: what the server sent', () => {
  it('has every card in the HTML a server renders, before any script runs', () => {
    const html = renderToString(<DiscoverTemplates initial={DATA} />);
    for (const name of ['Job Application', 'Event Registration', 'Exit Interview', 'Wedding RSVP', 'Patient Intake Form']) expect(html).toContain(name);
    expect(html).toContain('Featured');
  });

  it('shows a Featured strip first, then the rest', () => {
    render(<DiscoverTemplates initial={DATA} />);
    const featured = screen.getByRole('region', { name: 'Featured' });
    expect(within(featured).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Job Application', 'Event Registration']);
    const rest = screen.getByRole('region', { name: 'All templates' });
    expect(within(rest).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Exit Interview', 'Wedding RSVP', 'Patient Intake Form']);
  });

  it('lists the groups with how many templates each holds, and All', () => {
    render(<DiscoverTemplates initial={DATA} />);
    const nav = screen.getByRole('navigation', { name: 'Template categories' });
    const buttons = within(nav).getAllByRole('button').map((b) => b.textContent);
    expect(buttons).toEqual(['All templates5', 'HR2', 'Events2', 'Healthcare1']);
    expect(within(nav).getByRole('button', { name: /All templates/ })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('category filtering', () => {
  it('shows one group when its button is pressed, and puts it in the address', async () => {
    window.scrollTo = vi.fn() as never;
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<DiscoverTemplates initial={DATA} />);
    await userEvent.click(screen.getByRole('button', { name: /^Events/ }));
    expect(cardNames()).toEqual(['Event Registration', 'Wedding RSVP']);
    // no Featured strip while a group is chosen
    expect(screen.queryByRole('region', { name: 'Featured' })).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(mockReplace).toHaveBeenLastCalledWith('/discover-templates?category=Events+%26+RSVPs', { scroll: false });
    vi.useRealTimers();
  });

  it('opens already filtered when the address has ?category=, including an old category name', () => {
    render(<DiscoverTemplates initial={DATA} initialCategory="Medicine" />);
    expect(cardNames()).toEqual(['Patient Intake Form']);
    expect(screen.getByRole('button', { name: /Healthcare/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows everything for a category that does not exist', () => {
    render(<DiscoverTemplates initial={DATA} initialCategory="nonsense" />);
    expect(cardNames()).toHaveLength(5);
  });
});

describe('search', () => {
  it('filters by name and description as you type, and puts the search in the address a moment later', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<DiscoverTemplates initial={DATA} />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search templates' }), 'wedding');
    expect(cardNames()).toEqual(['Wedding RSVP']);
    expect(screen.getByRole('status')).toHaveTextContent('1 of 5 templates');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(mockReplace).toHaveBeenLastCalledWith('/discover-templates?q=wedding', { scroll: false });
    vi.useRealTimers();
  });

  it('matches a word in the description too', async () => {
    render(<DiscoverTemplates initial={DATA} />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search templates' }), 'warm');
    expect(cardNames()).toEqual(['Wedding RSVP']);
  });

  it('opens already searched when the address has ?q=', () => {
    render(<DiscoverTemplates initial={DATA} initialQuery="interview" />);
    expect(cardNames()).toEqual(['Exit Interview']);
    expect(screen.getByRole('searchbox', { name: 'Search templates' })).toHaveValue('interview');
  });

  it('clears the search with its button', async () => {
    render(<DiscoverTemplates initial={DATA} initialQuery="wedding" />);
    await userEvent.click(screen.getByRole('button', { name: 'Clear the search' }));
    expect(cardNames()).toHaveLength(5);
  });
});

describe('when nothing matches', () => {
  it('says so, and offers to clear the filters or start from a blank form', async () => {
    render(<DiscoverTemplates initial={DATA} initialQuery="zzzzzz" />);
    expect(screen.getByText('No templates match your search.')).toBeInTheDocument();
    expect(cardNames()).toEqual([]);
    expect(screen.getByRole('link', { name: 'Start from a blank form' })).toHaveAttribute('href', '/try');
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(cardNames()).toHaveLength(5);
    expect(screen.getByRole('searchbox', { name: 'Search templates' })).toHaveValue('');
    expect(screen.queryByText('No templates match your search.')).not.toBeInTheDocument();
  });

  it('sends a signed-in visitor to the new-form page for a blank form', () => {
    authenticated = true;
    render(<DiscoverTemplates initial={DATA} initialQuery="zzzzzz" />);
    expect(screen.getByRole('link', { name: 'Start from a blank form' })).toHaveAttribute('href', '/forms/new');
  });

  it('also ends the list with a way to start from a blank form', () => {
    render(<DiscoverTemplates initial={DATA} />);
    expect(screen.getByText(/Can.t find what you need\?/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start from a blank form' })).toBeInTheDocument();
  });
});

describe('when the server could not send the cards', () => {
  const full = (slug: string, name: string, category: string) => ({ _id: `id-${slug}`, slug, name, description: 'd', category, fields: [{}, {}], settings: {}, isActive: true, showInGallery: true }) as unknown as Template;

  it('asks the browser for the full list, shows a skeleton while it loads, then the cards', () => {
    publicTemplates.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { unmount } = render(<DiscoverTemplates initial={null} />);
    expect(publicTemplates).toHaveBeenCalledWith({ enabled: true });
    expect(screen.getByTestId('templates-skeleton')).toBeInTheDocument();
    unmount();

    publicTemplates.mockReturnValue({ data: [full('a', 'Alpha Form', 'HR'), full('b', 'Beta Form', 'Events')], isLoading: false, error: null });
    render(<DiscoverTemplates initial={null} />);
    expect(cardNames()).toEqual(['Alpha Form', 'Beta Form']);
  });

  it('does not ask for the full list when the server did send the cards', () => {
    render(<DiscoverTemplates initial={DATA} />);
    expect(publicTemplates).toHaveBeenCalledWith({ enabled: false });
  });

  it('says it could not load, with a way to try again', async () => {
    publicTemplates.mockReturnValue({ data: undefined, isLoading: false, error: new Error('x') });
    render(<DiscoverTemplates initial={null} />);
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load templates right now.");
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefresh).toHaveBeenCalled();
  });
});

describe('GalleryIntro: the line under the title follows the sign-in state', () => {
  it('tells a signed-out visitor to sign up', () => {
    render(<GalleryIntro />);
    expect(screen.getByText(/Pick one, sign up, and it's already in your account/)).toBeInTheDocument();
  });

  it('tells a signed-in visitor it is added to their account', () => {
    authenticated = true;
    render(<GalleryIntro />);
    expect(screen.getByText(/Pick one and it's added to your account/)).toBeInTheDocument();
    expect(screen.queryByText(/sign up/)).not.toBeInTheDocument();
  });
});
