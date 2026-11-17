// The public template gallery's data and rules: the slim card the backend sends (GET /api/templates/gallery), search and category filtering, and the
// ?category= and ?q= parameters that keep a chosen view in the address. No React, no network: used by the server page and the client gallery.
import type { Template } from '@/types/form';

export interface GalleryCard {
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  fieldCount: number;
  estimatedMinutes: number;
  featured: boolean;
  sortOrder: number;
  layout: string;
  /** A ready-made picture of the template, when one exists. Without it the card draws the form itself. */
  thumbnail: string | null;
}
export interface GalleryGroup {
  name: string;
  count: number;
}
export interface GalleryData {
  cards: GalleryCard[];
  groups: GalleryGroup[];
}

export const ALL = 'All';

// The gallery page's title and description: what a search result and a shared link show. The description is about 150 characters.
export const DISCOVER_TITLE = 'Form templates for hiring, events, feedback and more';
export const DISCOVER_DESCRIPTION = 'Free form templates for hiring, events, feedback, bookings and more. Pick one, customise it and share it with a link. No code, ready in minutes.';
export const FEATURED_COUNT = 6;

/** The category names the catalogue used before it was regrouped, and the group each belongs to now (mirrors the backend's utils/templateCatalog.ts), so an old link keeps working. */
const LEGACY_GROUP: Record<string, string> = {
  'lead generation': 'Leads & Contact',
  'contact us': 'Leads & Contact',
  business: 'Leads & Contact',
  general: 'Leads & Contact',
  'e-commerce': 'Orders & Payments',
  order: 'Orders & Payments',
  events: 'Events & RSVPs',
  personal: 'Events & RSVPs',
  'reservation/booking': 'Bookings',
  feedback: 'Feedback & Surveys',
  hr: 'HR & Hiring',
  education: 'Education',
  medicine: 'Healthcare',
  'real estate': 'Real Estate',
  'non-profit': 'Community & Membership',
  membership: 'Community & Membership',
  registration: 'Community & Membership',
  'working forms': 'Internal Requests & Inspections',
  requests: 'Internal Requests & Inspections',
  'inspection forms': 'Internal Requests & Inspections',
  advanced: 'Internal Requests & Inspections',
  consent: 'Consent & Legal',
};

/** A ?category= value as one of the groups on offer (a current group, or an old category name), or ALL when it is none of them. */
export function resolveCategory(value: string | null | undefined, groups: GalleryGroup[]): string {
  const wanted = (value ?? '').trim().toLowerCase();
  if (!wanted || wanted === ALL.toLowerCase()) return ALL;
  const direct = groups.find((g) => g.name.toLowerCase() === wanted);
  if (direct) return direct.name;
  const mapped = LEGACY_GROUP[wanted];
  return mapped && groups.some((g) => g.name === mapped) ? mapped : ALL;
}

const words = (text: string): string[] => text.toLowerCase().split(/\s+/).filter(Boolean);

/** Cards in one group (or all), narrowed to those whose name or description holds every word searched for. Order is kept. */
export function filterCards(cards: GalleryCard[], opts: { category: string; q: string }): GalleryCard[] {
  const needles = words(opts.q);
  return cards.filter((c) => {
    if (opts.category !== ALL && c.category !== opts.category) return false;
    if (!needles.length) return true;
    const haystack = `${c.name} ${c.description}`.toLowerCase();
    return needles.every((n) => haystack.includes(n));
  });
}

/** The gallery's address for a chosen view: no parameter for "All" or an empty search, so the plain page keeps its plain address. */
export function buildGalleryHref(opts: { category: string; q: string }): string {
  const p = new URLSearchParams();
  if (opts.category && opts.category !== ALL) p.set('category', opts.category);
  const q = opts.q.trim();
  if (q) p.set('q', q);
  const s = p.toString();
  return s ? `/discover-templates?${s}` : '/discover-templates';
}

export const SEARCH_MAX = 80;
/** A ?q= value, trimmed and kept to a sensible length. */
export const cleanQuery = (value: string | null | undefined): string => (value ?? '').trim().slice(0, SEARCH_MAX);

/** Where "Use template" goes: straight to apply when signed in, through sign-up first (carrying the SLUG) when not. */
export function useTemplateHref(slug: string, signedIn: boolean): string {
  const apply = `/templates/apply/${encodeURIComponent(slug)}`;
  return signedIn ? apply : `/signup?next=${encodeURIComponent(apply)}`;
}

/** A card from a full template, for when only the full list could be loaded (the card list from the server was not available). */
export function cardFromTemplate(t: Template, order: number): GalleryCard {
  const live = t.fields.filter((f) => !f.deleted);
  return {
    slug: t.slug || t._id,
    name: t.name,
    description: t.description,
    category: t.category,
    tags: [],
    fieldCount: live.length,
    estimatedMinutes: Math.max(1, Math.ceil(live.length / 3)),
    featured: false,
    sortOrder: order,
    layout: t.settings?.layout ?? 'classic',
    thumbnail: null,
  };
}

/** The groups with their counts, worked out from cards. */
export function groupsFromCards(cards: GalleryCard[]): GalleryGroup[] {
  const counts = new Map<string, number>();
  for (const c of cards) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}
