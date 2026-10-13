import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthCard } from '@/components/auth/AuthCard';

describe('AuthCard', () => {
  it('renders the wordmark above its children', () => {
    render(
      <AuthCard>
        <p>Sign in</p>
      </AuthCard>
    );
    expect(screen.getAllByAltText('Beginso').length).toBeGreaterThan(0);
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('always carries the auth-touch class and merges a custom one', () => {
    const { container } = render(<AuthCard className="extra">x</AuthCard>);
    const card = container.firstElementChild as HTMLElement;
    expect(card).toHaveClass('auth-touch');
    expect(card).toHaveClass('extra');
  });

  it('works without a className', () => {
    const { container } = render(<AuthCard>x</AuthCard>);
    expect((container.firstElementChild as HTMLElement).className).not.toContain('undefined');
  });
});
