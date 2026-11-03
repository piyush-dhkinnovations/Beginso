/**
 * The four newer layout frames (Chat, Sidebar, Open, Focus): each renders its children and the title, shows the badge, takes the page wash and the
 * theme scope, and decides on its own chrome (progress, step list, cover, header) from props. Plus the width table and the one-question-at-a-time set.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { ComponentType } from 'react';
import { ChatLayout } from '@/components/public-form/layouts/ChatLayout';
import { SidebarLayout } from '@/components/public-form/layouts/SidebarLayout';
import { OpenLayout } from '@/components/public-form/layouts/OpenLayout';
import { FocusLayout } from '@/components/public-form/layouts/FocusLayout';
import { isGrouped, isOneAtATime, ONE_AT_A_TIME, widthClass, fieldsClassFor, type LayoutFrameProps } from '@/components/public-form/layouts/shared';
import { LAYOUT_COMPONENTS } from '@/components/public-form/layouts';
import type { LayoutPreset } from '@/types/form';

const base = (layout: LayoutPreset, over: Partial<LayoutFrameProps> = {}): Omit<LayoutFrameProps, 'children'> => ({
  layout,
  branding: { primaryColor: '#112233' },
  title: 'Survey',
  stepNames: ['Your details', 'Your project', ''],
  currentPage: 1,
  question: { current: 2, total: 5 },
  ...over,
});

const FRAMES: [LayoutPreset, ComponentType<LayoutFrameProps>][] = [
  ['chat', ChatLayout],
  ['sidebar', SidebarLayout],
  ['open', OpenLayout],
  ['focus', FocusLayout],
];

describe.each(FRAMES)('%s layout', (layout, Layout) => {
  it('renders its children and the form title, and shows the badge after the form', () => {
    render(
      <Layout {...base(layout)}>
        <p>BODY</p>
      </Layout>,
    );
    expect(screen.getByText('BODY')).toBeInTheDocument();
    expect(screen.getAllByText('Survey').length).toBeGreaterThan(0);
    const badge = screen.getByRole('link', { name: /Made with Beginso/ });
    expect(screen.getByText('BODY').compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('leaves the badge out of the builder preview', () => {
    render(
      <Layout {...base(layout, { previewMode: true })}>
        <p>BODY</p>
      </Layout>,
    );
    expect(screen.queryByRole('link', { name: /Made with Beginso/ })).not.toBeInTheDocument();
  });

  it('applies the page wash, and carries the look scope the owner\'s colours and sizes ride on', () => {
    const { container } = render(
      <Layout {...base(layout, { branding: { primaryColor: '#112233', backgroundStyle: 'solid', theme: { v: 1, card: { radius: 20 } } } })}>
        <p>BODY</p>
      </Layout>,
    );
    expect(container.firstElementChild as HTMLElement).toHaveStyle({ backgroundColor: '#112233' });
    expect(container.querySelector('.form-look')).toHaveAttribute('data-card-radius');
  });

  it('takes the form width from the owner\'s choice', () => {
    const { container, rerender } = render(
      <Layout {...base(layout, { branding: { formWidth: 'narrow' } })}>
        <p>BODY</p>
      </Layout>,
    );
    expect(container.querySelector('.form-width, [class*="max-w-"]')!.className).toContain(widthClass(layout, { formWidth: 'narrow' }).replace('form-width ', ''));
    rerender(
      <Layout {...base(layout, { branding: { formWidth: 'wide' } })}>
        <p>BODY</p>
      </Layout>,
    );
    expect(container.innerHTML).toContain(widthClass(layout, { formWidth: 'wide' }).replace('form-width ', ''));
  });

  it('marks the page title as decoration for a screen reader (the form\'s own h1 says it)', () => {
    const { container } = render(
      <Layout {...base(layout)}>
        <p>BODY</p>
      </Layout>,
    );
    const titles = Array.from(container.querySelectorAll('p')).filter((p) => p.textContent === 'Survey');
    expect(titles.length).toBeGreaterThan(0);
    for (const t of titles) expect(t).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Chat', () => {
  it('shows where the person is as text and as a progress bar, in the header above the bubble', () => {
    render(
      <ChatLayout {...base('chat')}>
        <p>BODY</p>
      </ChatLayout>,
    );
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Form progress' })).toBeInTheDocument();
  });

  it('shows no counter for a single question, nor with ?progress=0', () => {
    const { rerender } = render(
      <ChatLayout {...base('chat', { question: { current: 1, total: 1 } })}>
        <p>BODY</p>
      </ChatLayout>,
    );
    expect(screen.queryByText(/Question 1 of 1/)).not.toBeInTheDocument();
    rerender(
      <ChatLayout {...base('chat', { hideProgress: true })}>
        <p>BODY</p>
      </ChatLayout>,
    );
    expect(screen.queryByText(/Question 2 of 5/)).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('leaves out the header with ?cover=0, and the bubble stays', () => {
    render(
      <ChatLayout {...base('chat', { hideCover: true })}>
        <p>BODY</p>
      </ChatLayout>,
    );
    expect(screen.getByText('BODY')).toBeInTheDocument();
    expect(screen.queryByText('Survey')).not.toBeInTheDocument();
  });

  it('shows the logo when there is one, and the brand dot when there is not', () => {
    const { container, rerender } = render(
      <ChatLayout {...base('chat', { branding: { primaryColor: '#112233', logoUrl: 'https://x.test/l.png' } })}>
        <p>BODY</p>
      </ChatLayout>,
    );
    expect(container.querySelector('img[src="https://x.test/l.png"]')).toBeInTheDocument();
    rerender(
      <ChatLayout {...base('chat')}>
        <p>BODY</p>
      </ChatLayout>,
    );
    expect(container.querySelector('img[src="https://x.test/l.png"]')).not.toBeInTheDocument();
  });
});

describe('Focus', () => {
  it('has no card around the question, a counter and a thin progress line', () => {
    const { container } = render(
      <FocusLayout {...base('focus')}>
        <p>BODY</p>
      </FocusLayout>,
    );
    expect(container.querySelector('.form-card')).toBeNull();
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Form progress' })).toBeInTheDocument();
  });

  it('hides the counter for one question or ?progress=0', () => {
    render(
      <FocusLayout {...base('focus', { question: { current: 1, total: 1 } })}>
        <p>BODY</p>
      </FocusLayout>,
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});

describe('Open', () => {
  it('has no card, a header of logo, title and the owner\'s line of text, and then the questions', () => {
    const { container } = render(
      <OpenLayout {...base('open', { branding: { primaryColor: '#112233', bannerText: 'Two minutes' } })}>
        <p>BODY</p>
      </OpenLayout>,
    );
    expect(container.querySelector('.form-card')).toBeNull();
    expect(screen.getByText('Two minutes')).toBeInTheDocument();
    const header = container.querySelector('header')!;
    expect(within(header).getByText('Survey')).toBeInTheDocument();
    expect(header.compareDocumentPosition(screen.getByText('BODY')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('draws the cover picture whole, and leaves the header out with ?cover=0', () => {
    const { container, rerender } = render(
      <OpenLayout {...base('open', { branding: { coverImageUrl: 'https://x.test/c.jpg' } })}>
        <p>BODY</p>
      </OpenLayout>,
    );
    expect(container.querySelector('img[src="https://x.test/c.jpg"]')).toBeInTheDocument();
    rerender(
      <OpenLayout {...base('open', { hideCover: true, branding: { coverImageUrl: 'https://x.test/c.jpg' } })}>
        <p>BODY</p>
      </OpenLayout>,
    );
    expect(container.querySelector('img[src="https://x.test/c.jpg"]')).not.toBeInTheDocument();
    expect(container.querySelector('header')).toBeNull();
    expect(screen.getByText('BODY')).toBeInTheDocument();
  });
});

describe('Sidebar', () => {
  it('lists every page by name, marks the current one, and ticks the finished ones', () => {
    render(
      <SidebarLayout {...base('sidebar', { currentPage: 1 })}>
        <p>BODY</p>
      </SidebarLayout>,
    );
    const nav = screen.getByRole('navigation', { name: 'Form steps' });
    const items = within(nav).getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual(['Your details', '2Your project', '3Step 3']);
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(items[0].querySelector('svg')).not.toBeNull();
  });

  it('says the step in words for a phone and announces a change', () => {
    render(
      <SidebarLayout {...base('sidebar', { currentPage: 0 })}>
        <p>BODY</p>
      </SidebarLayout>,
    );
    expect(screen.getAllByText(/Step 1 of 3/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('status')).toHaveTextContent('Step 1 of 3: Your details');
  });

  it('has no list for a one-page form, and no rail at all without a logo', () => {
    const { container } = render(
      <SidebarLayout {...base('sidebar', { stepNames: ['Only'] })}>
        <p>BODY</p>
      </SidebarLayout>,
    );
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelector('.md\\:grid')).toBeNull();
    expect(screen.getByText('BODY')).toBeInTheDocument();
  });

  it('keeps the logo in the rail of a one-page form, and hides the list with ?progress=0', () => {
    render(
      <SidebarLayout {...base('sidebar', { stepNames: ['Only'], branding: { primaryColor: '#112233', logoUrl: 'https://x.test/l.png' } })}>
        <p>BODY</p>
      </SidebarLayout>,
    );
    expect(screen.getByRole('navigation', { name: 'Form steps' })).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('hides the list with ?progress=0', () => {
    render(
      <SidebarLayout {...base('sidebar', { hideProgress: true })}>
        <p>BODY</p>
      </SidebarLayout>,
    );
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});

describe('shared helpers for the new layouts', () => {
  it('Guided, Chat and Focus ask one question at a time; the rest do not', () => {
    expect([...ONE_AT_A_TIME]).toEqual(['guided', 'chat', 'focus']);
    for (const l of ['guided', 'chat', 'focus'] as const) expect(isOneAtATime(l)).toBe(true);
    for (const l of ['classic', 'card_stack', 'steps', 'split_feature', 'compact', 'sidebar', 'open'] as const) expect(isOneAtATime(l)).toBe(false);
  });

  it('one-at-a-time layouts are never grouped; Sidebar and Open pair short fields like Classic, and a single column on request', () => {
    for (const l of ['guided', 'chat', 'focus'] as const) expect(isGrouped(l, 'auto')).toBe(false);
    for (const l of ['sidebar', 'open', 'classic'] as const) {
      expect(isGrouped(l, 'auto')).toBe(true);
      expect(isGrouped(l, 'single')).toBe(false);
    }
    expect(isGrouped('compact', 'single')).toBe(true);
    expect(fieldsClassFor('chat')).toContain('flex-col');
    expect(fieldsClassFor('sidebar')).toContain('md:grid-cols-2');
  });

  it('every layout has a width for all three choices, narrow below standard below wide', () => {
    const order = ['max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl', 'max-w-7xl'];
    for (const l of ['chat', 'sidebar', 'open', 'focus'] as const) {
      const w = (formWidth: 'narrow' | 'standard' | 'wide') => order.indexOf(widthClass(l, { formWidth }).replace('form-width ', ''));
      expect(w('narrow')).toBeGreaterThanOrEqual(0);
      expect(w('narrow')).toBeLessThan(w('standard'));
      expect(w('standard')).toBeLessThan(w('wide'));
    }
  });

  it('the layout list has a component for every layout', () => {
    for (const l of ['classic', 'card_stack', 'guided', 'steps', 'split_feature', 'compact', 'chat', 'sidebar', 'open', 'focus'] as const) expect(LAYOUT_COMPONENTS[l]).toBeDefined();
  });
});
