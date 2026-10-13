import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ButtonLink } from '@/components/ui/ButtonLink';

describe('ButtonLink', () => {
  it('renders a real link with the primary button look by default', () => {
    render(<ButtonLink href="/forms/new">New form</ButtonLink>);
    const a = screen.getByRole('link', { name: 'New form' });
    expect(a).toHaveAttribute('href', '/forms/new');
    expect(a).toHaveClass('bg-btn', 'bg-btn-primary');
    expect(a).not.toHaveClass('bg-btn-sm');
  });

  it.each([
    ['secondary', 'bg-btn-secondary'],
    ['destructive', 'bg-btn-danger'],
    ['ghost', 'bg-btn-ghost'],
  ] as const)('maps the %s variant', (variant, cls) => {
    render(<ButtonLink href="/x" variant={variant}>Go</ButtonLink>);
    expect(screen.getByRole('link')).toHaveClass(cls);
  });

  it('adds the small size class and merges a custom className', () => {
    render(<ButtonLink href="/x" size="small" className="extra">Go</ButtonLink>);
    expect(screen.getByRole('link')).toHaveClass('bg-btn-sm', 'extra');
  });

  it('passes through link props such as aria-label', () => {
    render(<ButtonLink href="/x" aria-label="Open x">Go</ButtonLink>);
    expect(screen.getByRole('link', { name: 'Open x' })).toBeInTheDocument();
  });
});
