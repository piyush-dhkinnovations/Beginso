/**
 * Feature: form cards (Forms and Responses pages)
 * Tests: FormCard — the icon or uploaded logo is 48px either way, shown alone, and the card shows the form's facts.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormCard } from '@/components/forms/FormCard';
import type { Form } from '@/types/form';

const form = (over: Partial<Form> = {}): Form =>
  ({
    _id: 'f1',
    title: 'Product Order Form',
    description: 'Orders from the shop',
    status: 'published',
    responseCount: 2,
    updatedAt: '2026-10-14T10:00:00.000Z',
    branding: {},
    ...over,
  }) as Form;

const renderCard = (f: Form) => render(<FormCard form={f} href="/forms/f1/overview" menu={null} maxResponses={4} />);

describe('FormCard', () => {
  it('shows the icon that suits the title at 48px, with no box around it', () => {
    const { container } = renderCard(form());
    const svg = container.querySelector('svg[aria-hidden="true"]') as SVGElement;
    expect(svg).not.toBeNull();
    const box = svg.parentElement as HTMLElement;
    expect(box).toHaveStyle({ width: '48px', height: '48px' });
    expect(box.className).not.toMatch(/border|bg-/);
  });

  it('shows a chosen icon at the same 48px', () => {
    const { container } = renderCard(form({ branding: { iconName: 'rating-star' } }));
    expect((container.querySelector('svg')!.parentElement as HTMLElement)).toHaveStyle({ width: '48px', height: '48px' });
  });

  it('shows an uploaded logo at 48px too (not smaller, not larger)', () => {
    const { container } = renderCard(form({ branding: { logoUrl: '/logo.png' } }));
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('src', '/logo.png');
    expect(img.parentElement).toHaveStyle({ width: '48px', height: '48px', margin: '0px' });
  });

  it('links the title to the form and shows status, description and the response count', () => {
    renderCard(form());
    expect(screen.getByRole('link', { name: 'Product Order Form' })).toHaveAttribute('href', '/forms/f1/overview');
    expect(screen.getByText('Orders from the shop')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText(/responses/)).toBeInTheDocument();
  });
});
