import { describe, it, expect } from 'vitest';
import {
  ALL,
  DISCOVER_DESCRIPTION,
  DISCOVER_TITLE,
  buildGalleryHref,
  cardFromTemplate,
  cleanQuery,
  filterCards,
  groupsFromCards,
  groupKey,
  groupLabel,
  groupsThatAddUp,
  resolveCategory,
  useTemplateHref,
  type GalleryCard,
} from '@/lib/templateGallery';
import type { Template } from '@/types/form';

const card = (over: Partial<GalleryCard> = {}): GalleryCard => ({
  slug: 'job-application',
  name: 'Job Application',
  description: 'Collect CVs and cover letters from candidates.',
  category: 'HR & Hiring',
  tags: [],
  fieldCount: 6,
  estimatedMinutes: 3,
  featured: false,
  sortOrder: 1,
  layout: 'classic',
  thumbnail: null,
  ...over,
});

const CARDS = [
  card(),
  card({ slug: 'event-registration', name: 'Event Registration', description: 'Sign people up for your event.', category: 'Events & RSVPs' }),
  card({ slug: 'wedding-rsvp', name: 'Wedding RSVP', description: 'A warm RSVP for a wedding, with a meal choice.', category: 'Events & RSVPs' }),
  card({ slug: 'exit-interview', name: 'Exit Interview', description: 'Learn why someone is leaving.', category: 'HR & Hiring' }),
];
const GROUPS = [
  { name: 'HR & Hiring', count: 2 },
  { name: 'Events & RSVPs', count: 2 },
  { name: 'Healthcare', count: 1 },
];

describe('filterCards', () => {
  it('keeps every card, in order, for All and no search', () => {
    expect(filterCards(CARDS, { category: ALL, q: '' }).map((c) => c.slug)).toEqual(['job-application', 'event-registration', 'wedding-rsvp', 'exit-interview']);
  });

  it('keeps one group', () => {
    expect(filterCards(CARDS, { category: 'Events & RSVPs', q: '' }).map((c) => c.slug)).toEqual(['event-registration', 'wedding-rsvp']);
  });

  it('searches the name and the description, ignoring case', () => {
    expect(filterCards(CARDS, { category: ALL, q: 'WEDDING' }).map((c) => c.slug)).toEqual(['wedding-rsvp']);
    expect(filterCards(CARDS, { category: ALL, q: 'leaving' }).map((c) => c.slug)).toEqual(['exit-interview']);
  });

  it('wants every word searched for, in either place', () => {
    expect(filterCards(CARDS, { category: ALL, q: 'rsvp meal' }).map((c) => c.slug)).toEqual(['wedding-rsvp']);
    expect(filterCards(CARDS, { category: ALL, q: 'rsvp cv' })).toEqual([]);
  });

  it('combines a group and a search', () => {
    expect(filterCards(CARDS, { category: 'HR & Hiring', q: 'interview' }).map((c) => c.slug)).toEqual(['exit-interview']);
    expect(filterCards(CARDS, { category: 'Healthcare', q: 'interview' })).toEqual([]);
  });

  it('ignores extra spaces in the search', () => {
    expect(filterCards(CARDS, { category: ALL, q: '   exit    interview  ' }).map((c) => c.slug)).toEqual(['exit-interview']);
  });
});

describe('the address of a view (?category= and ?q=)', () => {
  it('has no parameter for the plain page', () => {
    expect(buildGalleryHref({ category: ALL, q: '' })).toBe('/discover-templates');
    expect(buildGalleryHref({ category: ALL, q: '   ' })).toBe('/discover-templates');
  });

  it('carries the group and the search, encoded', () => {
    expect(buildGalleryHref({ category: 'Events & RSVPs', q: '' })).toBe('/discover-templates?category=Events+%26+RSVPs');
    expect(buildGalleryHref({ category: ALL, q: 'job form' })).toBe('/discover-templates?q=job+form');
    expect(buildGalleryHref({ category: 'Bookings', q: 'spa' })).toBe('/discover-templates?category=Bookings&q=spa');
  });

  it('keeps a search to a sensible length', () => {
    expect(cleanQuery('  hello  ')).toBe('hello');
    expect(cleanQuery('x'.repeat(500))).toHaveLength(80);
    expect(cleanQuery(null)).toBe('');
  });
});

describe('resolveCategory', () => {
  it('takes a group name in any case', () => {
    expect(resolveCategory('healthcare', GROUPS)).toBe('Healthcare');
    expect(resolveCategory('Events & RSVPs', GROUPS)).toBe('Events & RSVPs');
  });

  it('maps an old category name onto its group, so an old link still works', () => {
    expect(resolveCategory('Medicine', GROUPS)).toBe('Healthcare');
    expect(resolveCategory('hr', GROUPS)).toBe('HR & Hiring');
    expect(resolveCategory('Events', GROUPS)).toBe('Events & RSVPs');
  });

  it('is All for nothing, All, or something that is not there', () => {
    expect(resolveCategory(null, GROUPS)).toBe(ALL);
    expect(resolveCategory('', GROUPS)).toBe(ALL);
    expect(resolveCategory('all', GROUPS)).toBe(ALL);
    expect(resolveCategory('nonsense', GROUPS)).toBe(ALL);
    // an old name whose group is not on offer here
    expect(resolveCategory('Consent', GROUPS)).toBe(ALL);
  });
});

describe('useTemplateHref: the slug travels through sign-up', () => {
  it('goes straight to apply when signed in', () => {
    expect(useTemplateHref('job-application', true)).toBe('/templates/apply/job-application');
  });

  it('goes through sign-up first when signed out, carrying the slug in `next`', () => {
    const href = useTemplateHref('job-application', false);
    expect(href).toBe('/signup?next=%2Ftemplates%2Fapply%2Fjob-application');
    expect(decodeURIComponent(new URL(href, 'http://x').searchParams.get('next')!)).toBe('/templates/apply/job-application');
  });
});

describe('a card made from a full template, and the groups', () => {
  const full = { _id: 'id1', slug: 'job-application', name: 'Job Application', description: 'd', category: 'HR', fields: [{ deleted: false }, { deleted: true }, { deleted: false }], settings: { layout: 'steps' } } as unknown as Template;

  it('counts only the questions that are not deleted', () => {
    const c = cardFromTemplate(full, 4);
    expect(c).toEqual(expect.objectContaining({ slug: 'job-application', fieldCount: 2, layout: 'steps', sortOrder: 4, thumbnail: null, featured: false }));
    expect(c.estimatedMinutes).toBeGreaterThanOrEqual(1);
  });

  it('uses the id when a template has no slug yet', () => {
    expect(cardFromTemplate({ ...full, slug: undefined } as unknown as Template, 1).slug).toBe('id1');
  });

  it('counts a group from its cards', () => {
    expect(groupsFromCards(CARDS)).toEqual([
      { name: 'HR & Hiring', count: 2 },
      { name: 'Events & RSVPs', count: 2 },
    ]);
  });
});

describe('the page title and description', () => {
  it('has a real description of about 150 characters, not a placeholder', () => {
    expect(DISCOVER_DESCRIPTION).not.toMatch(/Automated/i);
    expect(DISCOVER_DESCRIPTION.length).toBeGreaterThanOrEqual(120);
    expect(DISCOVER_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(DISCOVER_DESCRIPTION).toMatch(/hiring/);
    expect(DISCOVER_DESCRIPTION).toMatch(/events/);
    expect(DISCOVER_DESCRIPTION).toMatch(/feedback/);
    expect(DISCOVER_TITLE.length).toBeGreaterThan(10);
  });
});

describe('groupsThatAddUp', () => {
  const c = (category: string) => cardFromTemplate({ _id: category, slug: category, name: category, category, fields: [], isActive: true } as never, 1);
  it('keeps the server groups when they account for every card', () => {
    const cards = [c('HR & Hiring'), c('HR & Hiring'), c('Healthcare')];
    const groups = [{ name: 'HR & Hiring', count: 2 }, { name: 'Healthcare', count: 1 }];
    expect(groupsThatAddUp(cards, groups)).toBe(groups);
  });

  it('works the groups out from the cards when the server list leaves cards out', () => {
    const cards = [c('HR'), c('HR'), c('Events'), c('Education'), c('Real Estate')];
    const partial = [{ name: 'Education', count: 1 }, { name: 'Real Estate', count: 1 }];
    const groups = groupsThatAddUp(cards, partial);
    expect(groups.map((g) => g.name).sort()).toEqual(['Education', 'Events & RSVPs', 'HR & Hiring', 'Real Estate']);
    expect(groups.reduce((n, g) => n + g.count, 0)).toBe(cards.length);
  });

  it('works them out when the server sends none, or counts that do not add up', () => {
    const cards = [c('A'), c('B')];
    expect(groupsThatAddUp(cards, [])).toEqual([{ name: 'A', count: 1 }, { name: 'B', count: 1 }]);
    expect(groupsThatAddUp(cards, [{ name: 'A', count: 1 }, { name: 'B', count: 5 }]).map((g) => g.count)).toEqual([1, 1]);
  });
});

describe('groupKey', () => {
  it('gives a current group its own lower-case name', () => {
    expect(groupKey('Healthcare')).toBe('healthcare');
    expect(groupKey(' Real Estate ')).toBe('real estate');
  });

  it('gives every old category name the group it belongs to now, so it gets that group\'s icon', () => {
    expect(groupKey('HR')).toBe('hr & hiring');
    expect(groupKey('Medicine')).toBe('healthcare');
    expect(groupKey('Non-profit')).toBe('community & membership');
    expect(groupKey('Reservation/Booking')).toBe('bookings');
    expect(groupKey('E-commerce')).toBe('orders & payments');
    expect(groupKey('Working Forms')).toBe('internal requests & inspections');
    expect(groupKey('Lead Generation')).toBe('leads & contact');
  });

  it('leaves an unknown name as it is (it then gets the generic icon)', () => {
    expect(groupKey('Something New')).toBe('something new');
  });
});

describe('groupLabel and merging old names', () => {
  it('shows short names for the long groups, and the other names as they are', () => {
    expect(groupLabel('Internal Requests & Inspections')).toBe('Internal');
    expect(groupLabel('Consent & Legal')).toBe('Legal');
    expect(groupLabel('Leads & Contact')).toBe('Leads');
    expect(groupLabel('Community & Membership')).toBe('Community');
    expect(groupLabel('HR & Hiring')).toBe('HR');
    expect(groupLabel('Healthcare')).toBe('Healthcare');
    expect(groupLabel('Something New')).toBe('Something New');
  });

  it('gives an old category name the short name of its group', () => {
    expect(groupLabel('Working Forms')).toBe('Internal');
    expect(groupLabel('Consent')).toBe('Legal');
    expect(groupLabel('Non-profit')).toBe('Community');
  });

  it('merges old names that belong to one group into one entry, and filters by the group', () => {
    const c = (category: string) => cardFromTemplate({ _id: category, slug: category, name: category, category, fields: [], isActive: true } as never, 1);
    const cards = [c('Events'), c('Personal'), c('Events & RSVPs'), c('HR')];
    const groups = groupsFromCards(cards);
    expect(groups).toEqual([{ name: 'Events & RSVPs', count: 3 }, { name: 'HR & Hiring', count: 1 }]);
    expect(filterCards(cards, { category: 'Events & RSVPs', q: '' })).toHaveLength(3);
  });
});

describe('the Fun & Polls group', () => {
  it('shows as Fun, keeps its stored name, and merges nothing else into it', () => {
    expect(groupLabel('Fun & Polls')).toBe('Fun');
    expect(groupKey('Fun & Polls')).toBe('fun & polls');
    expect(groupLabel('Fun')).toBe('Fun');
  });
});
