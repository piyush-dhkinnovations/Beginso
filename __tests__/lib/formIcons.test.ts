/**
 * Feature: form icon (Streamline Ultimate Color set)
 * Tests: lib/formIcons — a clean, unique, server-valid icon set with real artwork, the credit, the suggestion from a form name,
 * the search; and that the generated data matches the list it is built from.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FEATURED_ICON_NAMES, FORM_ICONS, ICON_CREDIT, getFormIcon, searchFormIcons, suggestFormIcon } from '@/lib/formIcons';
import { formVisual } from '@/lib/formVisual';

describe('formIcons', () => {
  it('every icon name is a unique slug the server accepts (a-z, 0-9, hyphen, 2-40 chars)', () => {
    const names = FORM_ICONS.map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n).toMatch(/^[a-z0-9-]{2,40}$/);
  });

  it('every icon has a label, search words, a hue, and real SVG artwork (no scripts or event handlers)', () => {
    for (const i of FORM_ICONS) {
      expect(i.label.length).toBeGreaterThan(1);
      expect(i.keywords.length).toBeGreaterThan(1);
      expect(i.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(i.body.length).toBeGreaterThan(40);
      expect(i.body).toMatch(/<(path|g|circle|rect|ellipse|line|polygon|polyline)/);
      expect(i.body).not.toMatch(/<script|\son\w+=|javascript:/i);
    }
  });

  it('is a decent-sized set with several hues', () => {
    expect(FORM_ICONS.length).toBeGreaterThanOrEqual(90);
    expect(new Set(FORM_ICONS.map((i) => i.color)).size).toBeGreaterThanOrEqual(8);
  });

  it('the up-front set is 14 distinct icons that all exist', () => {
    expect(FEATURED_ICON_NAMES).toHaveLength(14);
    expect(new Set(FEATURED_ICON_NAMES).size).toBe(14);
    for (const n of FEATURED_ICON_NAMES) expect(getFormIcon(n)).toBeDefined();
  });

  it('looks an icon up by name, and returns nothing for an unknown, empty or missing name', () => {
    expect(getFormIcon('shopping-cart-full')?.label).toBe('Order');
    expect(getFormIcon('nope')).toBeUndefined();
    expect(getFormIcon('')).toBeUndefined();
    expect(getFormIcon(null)).toBeUndefined();
  });

  it('search matches names, labels and keywords, ignores case and spacing, and an empty search returns everything', () => {
    expect(searchFormIcons('')).toHaveLength(FORM_ICONS.length);
    expect(searchFormIcons('  ')).toHaveLength(FORM_ICONS.length);
    expect(searchFormIcons('WALLET').map((i) => i.name)).toContain('money-wallet-open');
    expect(searchFormIcons('money').map((i) => i.name)).toEqual(expect.arrayContaining(['money-wallet-open', 'money-bag-dollar']));
    expect(searchFormIcons('restaurant').map((i) => i.name)).toContain('seafood-sushi');
    expect(searchFormIcons('zzzzqq')).toEqual([]);
  });

  it('carries the credit the licence asks for', () => {
    expect(ICON_CREDIT.text).toMatch(/Streamline/);
    expect(ICON_CREDIT.text).toMatch(/CC BY 4\.0/);
    expect(ICON_CREDIT.url).toBe('https://streamlinehq.com');
  });

  it('the generated data is built from the list in scripts/formIconSet.json (run npm run generate:form-icons after editing it)', () => {
    const list = JSON.parse(readFileSync('scripts/formIconSet.json', 'utf8')).icons as { name: string; featured?: boolean }[];
    expect(FORM_ICONS.map((i) => i.name)).toEqual(list.map((i) => i.name));
    expect(FEATURED_ICON_NAMES).toEqual(list.filter((i) => i.featured).map((i) => i.name));
  });
});

describe('suggestFormIcon', () => {
  it.each([
    ['Customer Feedback Survey', 'rating-star'],
    ['Event Registration', 'calendar-1'],
    ['Job Application', 'cash-briefcase'],
    ['Product Order Form', 'shopping-cart-full'],
    ['Contact us', 'phone-actions-call'],
    ['Pitch deck', 'idea-strategy'],
    ['Final exam', 'notes-checklist-flip'],
    ['Donation', 'credit-card-1'],
    ['Student intake', 'single-woman-book'],
    ['Appointment', 'calendar-date'],
    ['Newsletter signup', 'send-email-fly'],
    ['Help desk', 'headphones-customer-support-question'],
    ['Volunteer sign-up', 'multiple-users-1'],
    ['Patient intake', 'monitor-heart-beat'],
    ['Trip planner', 'style-one-pin-plane'],
    ['Restaurant menu', 'fast-food-french-fries'],
  ])('"%s" gets %s', (title, name) => {
    expect(suggestFormIcon(title).name).toBe(name);
  });

  it('every suggestion is an icon that exists', () => {
    for (const t of ['feedback', 'event', 'job', 'order', 'contact', 'idea', 'quiz', 'payment', 'student', 'booking', 'newsletter', 'support', 'team', 'comment', 'health', 'travel', 'food', 'zzz']) {
      expect(getFormIcon(suggestFormIcon(t).name)).toBeDefined();
    }
  });

  it('falls back to the plain document icon for a name that says nothing, and for an empty or missing one', () => {
    expect(suggestFormIcon('Untitled').name).toBe('common-file-text');
    expect(suggestFormIcon('').name).toBe('common-file-text');
    expect(suggestFormIcon(null).name).toBe('common-file-text');
    expect(suggestFormIcon(undefined).name).toBe('common-file-text');
  });

  it("gives the colour a form is known by (an avatar's background) from the same suggestion", () => {
    expect(formVisual('Event Registration').ink).toBe(suggestFormIcon('Event Registration').color);
  });
});
