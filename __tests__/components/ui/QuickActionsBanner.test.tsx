import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickActionsBanner } from '@/components/ui/QuickActionsBanner';

describe('QuickActionsBanner', () => {
  it('is a labelled section with title, description and icon', () => {
    render(
      <QuickActionsBanner
        title="Get started"
        description="Create your first form"
        icon={<svg data-testid="ico" />}
        actions={[{ label: 'New form', href: '/forms/new' }]}
      />,
    );
    expect(screen.getByRole('region', { name: 'Get started' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Get started' })).toBeInTheDocument();
    expect(screen.getByText('Create your first form')).toBeInTheDocument();
    expect(screen.getByTestId('ico')).toBeInTheDocument();
  });

  it('renders each action as a link; only the first is the filled one', () => {
    render(
      <QuickActionsBanner
        title="t"
        actions={[
          { label: 'Primary', href: '/a', icon: <svg data-testid="a-icon" /> },
          { label: 'Second', href: '/b' },
        ]}
      />,
    );
    const first = screen.getByRole('link', { name: 'Primary' });
    const second = screen.getByRole('link', { name: 'Second' });
    expect(first).toHaveAttribute('href', '/a');
    expect(second).toHaveAttribute('href', '/b');
    expect(first.className).toMatch(/bg-white/);
    expect(second.className).toMatch(/border-white/);
    expect(screen.getByTestId('a-icon')).toBeInTheDocument();
  });

  it('omits the description and icon when not given', () => {
    const { container } = render(<QuickActionsBanner title="t" actions={[]} />);
    expect(container.querySelector('p')).toBeNull();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
