/**
 * The six public-form layout frames plus their shared helpers. A layout is chrome only: it must always render
 * its children, and decide on banner / progress / step list from props.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { ClassicLayout } from '@/components/public-form/layouts/ClassicLayout';
import { CardStackLayout } from '@/components/public-form/layouts/CardStackLayout';
import { CompactLayout } from '@/components/public-form/layouts/CompactLayout';
import { GuidedLayout } from '@/components/public-form/layouts/GuidedLayout';
import { StepsLayout } from '@/components/public-form/layouts/StepsLayout';
import { SplitFeatureLayout } from '@/components/public-form/layouts/SplitFeatureLayout';
import { fieldsClassFor, isGrouped, widthClass, cardClass, type LayoutFrameProps } from '@/components/public-form/layouts/shared';
import type { LayoutPreset } from '@/types/form';

const base = (layout: LayoutPreset, over: Partial<LayoutFrameProps> = {}): Omit<LayoutFrameProps, 'children'> => ({
  layout,
  branding: { primaryColor: '#112233' },
  title: 'Survey',
  stepNames: ['One', 'Two', ''],
  currentPage: 1,
  ...over,
});

const FRAMES: [LayoutPreset, ComponentType<LayoutFrameProps>][] = [
  ['classic', ClassicLayout],
  ['card_stack', CardStackLayout],
  ['compact', CompactLayout],
  ['guided', GuidedLayout],
  ['steps', StepsLayout],
  ['split_feature', SplitFeatureLayout],
];

describe.each(FRAMES)('%s layout', (layout, Layout) => {
  it('renders its children and the form title', () => {
    render(
      <Layout {...base(layout)}>
        <p>BODY</p>
      </Layout>
    );
    expect(screen.getByText('BODY')).toBeInTheDocument();
    expect(screen.getAllByText('Survey').length).toBeGreaterThan(0);
  });

  it('applies the page wash to the backdrop', () => {
    const { container } = render(
      <Layout {...base(layout, { branding: { primaryColor: '#112233', backgroundStyle: 'solid' } })}>
        <p>BODY</p>
      </Layout>
    );
    const backdrop = container.firstElementChild as HTMLElement;
    expect(backdrop).toHaveStyle({ backgroundColor: '#112233' });
    expect(backdrop.className).toContain('min-h-screen');
  });

  it('previewMode does not force a full-viewport backdrop', () => {
    const { container } = render(
      <Layout {...base(layout, { previewMode: true })}>
        <p>BODY</p>
      </Layout>
    );
    expect((container.firstElementChild as HTMLElement).className).not.toContain('min-h-screen');
  });
});

// Split Feature has no banner (hideCover only removes its cover image; covered below).
describe.each(FRAMES.filter(([l]) => l !== 'split_feature'))('%s layout banner', (layout, Layout) => {
  it('hideCover drops the headline banner', () => {
    render(
      <Layout {...base(layout, { hideCover: true })}>
        <p>BODY</p>
      </Layout>
    );
    expect(screen.getByText('BODY')).toBeInTheDocument();
    expect(screen.queryByText('Survey')).not.toBeInTheDocument();
  });
});

describe('GuidedLayout progress', () => {
  it('shows "Question N of M" with an accessible progress bar', () => {
    render(
      <GuidedLayout {...base('guided', { question: { current: 2, total: 5 } })}>
        <p>BODY</p>
      </GuidedLayout>
    );
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  });

  it.each([
    ['a single question', { question: { current: 1, total: 1 } }],
    ['no question info', {}],
    ['hideProgress', { question: { current: 2, total: 5 }, hideProgress: true }],
  ])('shows no counter for %s', (_n, over) => {
    render(
      <GuidedLayout {...base('guided', over)}>
        <p>BODY</p>
      </GuidedLayout>
    );
    expect(screen.queryByText(/Question/)).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});

describe('StepsLayout stepper', () => {
  it('lists named steps, falls back to "Step N" for untitled ones, and marks the current one', () => {
    render(
      <StepsLayout {...base('steps')}>
        <p>BODY</p>
      </StepsLayout>
    );
    const list = screen.getByRole('list', { name: 'Form steps' });
    expect(list).toHaveTextContent('One');
    expect(list).toHaveTextContent('Two');
    expect(list).toHaveTextContent('Step 3');
    const current = list.querySelector('[aria-current="step"]');
    expect(current).toHaveTextContent('Two');
  });

  it('announces progress on change through a status region and a compact mobile line', () => {
    render(
      <StepsLayout {...base('steps')}>
        <p>BODY</p>
      </StepsLayout>
    );
    expect(screen.getByRole('status')).toHaveTextContent('Step 2 of 3: Two');
    expect(screen.getByText('Step 2 of 3 · Two')).toBeInTheDocument();
  });

  it('shows no stepper for a single page or with hideProgress', () => {
    const { rerender } = render(
      <StepsLayout {...base('steps', { stepNames: ['Only'], currentPage: 0 })}>
        <p>BODY</p>
      </StepsLayout>
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    rerender(
      <StepsLayout {...base('steps', { hideProgress: true })}>
        <p>BODY</p>
      </StepsLayout>
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('SplitFeatureLayout panel', () => {
  it('puts the form before the decorative panel in DOM order and hides the panel from assistive tech', () => {
    const { container } = render(
      <SplitFeatureLayout {...base('split_feature')}>
        <p>BODY</p>
      </SplitFeatureLayout>
    );
    const hidden = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(hidden).toHaveTextContent('Survey');
    expect(hidden).toHaveTextContent('Two');
    expect(screen.getByText('BODY').compareDocumentPosition(hidden) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('omits the step label for a single-page form and the headline for an empty title', () => {
    const { container } = render(
      <SplitFeatureLayout {...base('split_feature', { stepNames: ['Only'], currentPage: 0, title: '' })}>
        <p>BODY</p>
      </SplitFeatureLayout>
    );
    expect((container.querySelector('[aria-hidden="true"]') as HTMLElement).textContent).toBe('');
  });

  it('renders cover image and logo in the panel, but no cover when hideCover is set', () => {
    const branding = { primaryColor: '#112233', coverImageUrl: 'https://x.test/c.jpg', logoUrl: 'https://x.test/l.png' };
    const { container, rerender } = render(
      <SplitFeatureLayout {...base('split_feature', { branding })}>
        <p>BODY</p>
      </SplitFeatureLayout>
    );
    expect(container.querySelector('img[src="https://x.test/c.jpg"]')).toBeInTheDocument();
    expect(container.querySelector('img[src="https://x.test/l.png"]')).toBeInTheDocument();
    rerender(
      <SplitFeatureLayout {...base('split_feature', { branding, hideCover: true })}>
        <p>BODY</p>
      </SplitFeatureLayout>
    );
    expect(container.querySelector('img[src="https://x.test/c.jpg"]')).not.toBeInTheDocument();
    expect(container.querySelector('img[src="https://x.test/l.png"]')).toBeInTheDocument();
  });
});

describe('layout helpers', () => {
  it.each<[LayoutPreset, 'narrow' | 'standard' | 'wide' | undefined, string]>([
    ['classic', undefined, 'max-w-2xl'],
    ['classic', 'narrow', 'max-w-xl'],
    ['classic', 'wide', 'max-w-4xl'],
    ['guided', 'standard', 'max-w-xl'],
    ['steps', 'wide', 'max-w-5xl'],
    ['split_feature', 'narrow', 'md:max-w-4xl'],
    ['compact', 'wide', 'max-w-6xl'],
  ])('widthClass(%s, %s) = %s', (layout, formWidth, expected) => {
    expect(widthClass(layout, { formWidth })).toBe(expected);
  });

  it.each<[LayoutPreset, 'auto' | 'single' | undefined, boolean]>([
    ['classic', undefined, true],
    ['classic', 'auto', true],
    ['classic', 'single', false],
    ['guided', 'auto', false],
    ['compact', 'single', true],
    ['steps', 'single', false],
  ])('isGrouped(%s, %s) = %s', (layout, grouping, expected) => {
    expect(isGrouped(layout, grouping)).toBe(expected);
  });

  it('fieldsClassFor uses a two-column grid when grouped and a flex column otherwise, with spacing-based gaps', () => {
    expect(fieldsClassFor('classic')).toContain('md:grid-cols-2');
    expect(fieldsClassFor('classic')).toContain('gap-y-4');
    expect(fieldsClassFor('classic', 'compact')).toContain('gap-y-3');
    expect(fieldsClassFor('classic', 'spacious')).toContain('gap-y-7');
    expect(fieldsClassFor('guided')).toContain('flex-col');
    expect(fieldsClassFor('guided', 'spacious')).toContain('gap-7');
    expect(fieldsClassFor('classic', 'comfortable', 'single')).toContain('flex-col');
    expect(fieldsClassFor('compact', 'compact', 'single')).toContain('grid');
  });

  it('cardClass varies by card style and appends extra classes', () => {
    expect(cardClass({ cardStyle: 'bordered' })).toContain('border-2');
    expect(cardClass({ cardStyle: 'elevated' })).toContain('shadow-xl');
    expect(cardClass({ cardStyle: 'flat' }, 'extra-x')).toContain('extra-x');
    expect(cardClass({ cardStyle: 'flat' })).not.toContain('border');
  });
});
