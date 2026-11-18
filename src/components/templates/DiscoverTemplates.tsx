'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FileSignature,
  GraduationCap,
  HeartHandshake,
  Home,
  LayoutGrid,
  LayoutTemplate,
  Megaphone,
  PartyPopper,
  Search,
  ShoppingCart,
  Star,
  Stethoscope,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TemplateGalleryCard } from '@/components/templates/TemplateGalleryCard';
import { usePublicTemplates } from '@/hooks/usePublicTemplates';
import { useAuth } from '@/hooks/useAuth';
import {
  ALL,
  FEATURED_COUNT,
  SEARCH_MAX,
  buildGalleryHref,
  cardFromTemplate,
  cleanQuery,
  filterCards,
  groupsFromCards,
  groupKey,
  groupLabel,
  groupsThatAddUp,
  resolveCategory,
  type GalleryData,
} from '@/lib/templateGallery';
import { bx } from '@/lib/utils';

// One icon per group, so the list reads at a glance. A group outside this list still gets a generic icon, never a blank spot.
const GROUP_ICONS: Record<string, LucideIcon> = {
  'leads & contact': Megaphone,
  'orders & payments': ShoppingCart,
  'events & rsvps': CalendarDays,
  bookings: CalendarCheck,
  'feedback & surveys': Star,
  'hr & hiring': Briefcase,
  education: GraduationCap,
  healthcare: Stethoscope,
  'real estate': Home,
  'community & membership': HeartHandshake,
  'internal requests & inspections': ClipboardList,
  'consent & legal': FileSignature,
  'fun & polls': PartyPopper,
};
const groupIcon = (name: string): LucideIcon => GROUP_ICONS[groupKey(name)] ?? LayoutTemplate;

const GRID = 'grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3';

function SkeletonGrid() {
  return (
    <div data-testid="templates-skeleton" className="flex flex-col gap-8 md:flex-row md:items-start">
      <div className="h-11 w-full shrink-0 md:h-96 md:w-60" aria-hidden="true" />
      <div className={`${GRID} flex-1`}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="min-h-85 animate-pulse rounded-(--bg-radius-md) border border-(--border-default) bg-(--surface-card) p-5" aria-hidden="true">
            <div className="mb-4 h-32 rounded bg-(--surface-hover)" />
            <div className="mb-3 h-5 w-20 rounded-full bg-(--surface-hover)" />
            <div className="mb-2 h-5 w-3/5 rounded bg-(--surface-hover)" />
            <div className="mb-1.5 h-3 w-full rounded bg-(--surface-hover)" />
            <div className="h-3 w-4/5 rounded bg-(--surface-hover)" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The line under the page title. It depends on whether the visitor is signed in, so it is the one part of the header that waits for the browser. */
export function GalleryIntro() {
  const { isAuthenticated } = useAuth();
  return (
    <p className="bg-body-lg text-(--text-secondary)">
      Pre-built forms for hiring, events, feedback and more.{' '}
      {isAuthenticated ? "Pick one and it's added to your account, ready to customize." : "Pick one, sign up, and it's already in your account, ready to customize."}
    </p>
  );
}

export interface DiscoverTemplatesProps {
  /** The gallery from the server (so the cards are in the page's HTML), or null when the server could not get it. */
  initial: GalleryData | null;
  /** The view in the address when the page was asked for: `?category=` and `?q=`. */
  initialCategory?: string;
  initialQuery?: string;
}

export function DiscoverTemplates({ initial, initialCategory, initialQuery }: DiscoverTemplatesProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  // Only when the server could not give the cards: the full list is loaded here instead and turned into cards.
  const { data: full, isLoading, error } = usePublicTemplates({ enabled: !initial });

  const data = useMemo<GalleryData | null>(() => {
    if (initial) return { cards: initial.cards, groups: groupsThatAddUp(initial.cards, initial.groups) };
    if (!full) return null;
    const cards = full.filter((t) => t.showInGallery !== false).map((t, i) => cardFromTemplate(t, i + 1));
    return { cards, groups: groupsFromCards(cards) };
  }, [initial, full]);

  const [category, setCategory] = useState<string>(() => (initial ? resolveCategory(initialCategory, groupsThatAddUp(initial.cards, initial.groups)) : ALL));
  const [text, setText] = useState<string>(() => cleanQuery(initialQuery));
  const q = cleanQuery(text);

  // A category that arrives with the cards (the fallback loads them after the first paint) is applied once.
  const appliedInitial = useRef(!!initial);
  useEffect(() => {
    if (appliedInitial.current || !data) return;
    appliedInitial.current = true;
    setCategory(resolveCategory(initialCategory, data.groups));
  }, [data, initialCategory]);

  // The address follows the view, so a link can be shared: the category at once, the search a moment after typing stops.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const timer = setTimeout(() => router.replace(buildGalleryHref({ category, q }), { scroll: false }), 250);
    return () => clearTimeout(timer);
  }, [category, q, router]);

  if (!data) {
    if (isLoading) return <SkeletonGrid />;
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="bg-body text-(--text-muted)">{error ? "Couldn't load templates right now." : 'No templates available yet. Check back soon.'}</p>
        {error && (
          <Button variant="secondary" onClick={() => router.refresh()}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  const total = data.cards.length;
  const filtered = filterCards(data.cards, { category, q });
  const browsing = category === ALL && !q;
  const featured = browsing ? data.cards.filter((c) => c.featured).slice(0, FEATURED_COUNT) : [];
  const rest = featured.length ? filtered.filter((c) => !featured.includes(c)) : filtered;
  const blankHref = isAuthenticated ? '/forms/new' : '/try';

  const choose = (name: string) => {
    setCategory(name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const clear = () => {
    setText('');
    setCategory(ALL);
  };

  return (
    <div>
      <div className="mx-auto mb-8 max-w-xl">
        <Input
          id="template-search"
          type="search"
          aria-label="Search templates"
          placeholder="Search templates, for example hiring or RSVP"
          value={text}
          maxLength={SEARCH_MAX}
          onChange={(e) => setText(e.target.value)}
          leftIcon={<Search size={16} aria-hidden="true" />}
          rightSlot={
            text ? (
              <button type="button" onClick={() => setText('')} aria-label="Clear the search" className="flex size-8 items-center justify-center rounded-md text-(--text-muted) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-(--border-focus)">
                <X size={16} aria-hidden="true" />
              </button>
            ) : undefined
          }
        />
        <p role="status" className="mt-2 text-center bg-caption text-(--text-muted)">
          {filtered.length === total ? `${total} templates` : `${filtered.length} of ${total} templates`}
        </p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        {/* A row you swipe sideways on a phone; pinned beside the cards from md up. `sticky` and the list's own scrolling live on two different
            elements on purpose: combining them made a click on a button escalate to scrolling the whole page. */}
        <div className="shrink-0 md:sticky md:top-28">
          <nav
            aria-label="Template categories"
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-none md:max-h-[calc(100vh-8rem)] md:w-60 md:flex-col md:gap-1 md:overflow-y-auto md:overflow-x-visible md:pb-4 [&::-webkit-scrollbar]:hidden"
          >
            {[{ name: ALL, count: total }, ...data.groups].map((g) => {
              const Icon = g.name === ALL ? LayoutGrid : groupIcon(g.name);
              const active = category === g.name;
              return (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => choose(g.name)}
                  aria-pressed={active}
                  className={bx(
                    'flex min-h-11 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full border px-4 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-(--border-focus)',
                    'md:w-full md:rounded-lg md:border-transparent md:px-3',
                    active
                      ? 'border-(--primary-500) bg-(--accent-soft) text-(--primary-700)'
                      : 'border-(--border-default) bg-(--surface-card) text-(--text-secondary) hover:bg-(--surface-hover) md:bg-transparent',
                  )}
                >
                  <Icon size={16} className="shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-left">{g.name === ALL ? 'All templates' : groupLabel(g.name)}</span>
                  <span className="tabular-nums text-(--text-muted)">{g.count}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="min-w-0 flex-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <LayoutTemplate size={32} className="text-(--text-muted)" aria-hidden="true" />
              <p className="bg-body text-(--text-secondary)">No templates match your search.</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button variant="secondary" onClick={clear}>
                  Clear filters
                </Button>
                <Link href={blankHref} className="bg-body-sm font-semibold text-(--text-link) underline-offset-2 hover:underline">
                  Start from a blank form
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              {featured.length > 0 && (
                <section aria-labelledby="featured-heading">
                  <h2 id="featured-heading" className="bg-h4 mb-4 text-(--text-primary)">
                    Featured
                  </h2>
                  <div className={GRID}>
                    {featured.map((card) => (
                      <TemplateGalleryCard key={card.slug} card={card} signedIn={isAuthenticated} />
                    ))}
                  </div>
                </section>
              )}
              {rest.length > 0 && (
                <section aria-labelledby="all-heading">
                  <h2 id="all-heading" className={bx('bg-h4 mb-4 text-(--text-primary)', !featured.length && 'sr-only')}>
                    {category === ALL ? 'All templates' : groupLabel(category)}
                  </h2>
                  <div className={GRID}>
                    {rest.map((card) => (
                      <TemplateGalleryCard key={card.slug} card={card} signedIn={isAuthenticated} />
                    ))}
                  </div>
                </section>
              )}
              <p className="text-center bg-body-sm text-(--text-secondary)">
                Can&apos;t find what you need?{' '}
                <Link href={blankHref} className="font-semibold text-(--text-link) underline-offset-2 hover:underline">
                  Start from a blank form
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
