import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthCard } from '@/components/auth/AuthCard';

describe('AuthCard', () => {
  it('is a plain column holding its children (the wordmark and background live in the (auth) layout, no card around it)', () => {
    const { container } = render(
      <AuthCard>
        <p>Sign in</p>
      </AuthCard>
    );
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.queryByAltText('Beginso')).not.toBeInTheDocument();
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toMatch(/bg-card|border|shadow/);
  });

  it('always carries the auth-touch class and merges a custom one', () => {
    const { container } = render(<AuthCard className="extra">x</AuthCard>);
    const card = container.firstElementChild as HTMLElement;
    expect(card).toHaveClass('auth-touch');
    expect(card).toHaveClass('extra');
  });

  it('passes other attributes through (for example aria-busy)', () => {
    const { container } = render(<AuthCard aria-busy="true">x</AuthCard>);
    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true');
  });

  it('works without a className', () => {
    const { container } = render(<AuthCard>x</AuthCard>);
    expect((container.firstElementChild as HTMLElement).className).not.toContain('undefined');
  });
});
