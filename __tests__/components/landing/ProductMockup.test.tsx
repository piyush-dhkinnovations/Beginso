/**
 * __tests__/components/landing/ProductMockup.test.tsx
 * Audit remediation: ProductMockup had zero test coverage. Tests: renders both
 * mocked fields (name/email) without crashing, whether or not the typing
 * animation is mid-run.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductMockup from '@/components/landing/ProductMockup';

const mockUseTypingEffect = vi.fn();
vi.mock('@/hooks/useTypingEffect', () => ({
  useTypingEffect: (text: string) => mockUseTypingEffect(text),
}));

describe('ProductMockup component', () => {
  it('renders the Full Name and Email Address field labels', () => {
    mockUseTypingEffect.mockReturnValue({ displayedText: '', isTyping: false });
    render(<ProductMockup />);
    expect(screen.getByText('Full Name')).toBeInTheDocument();
    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });

  it('shows the fully-typed text and no cursor once typing has finished', () => {
    mockUseTypingEffect.mockImplementation((text: string) => ({ displayedText: text, isTyping: false }));
    render(<ProductMockup />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(document.querySelector('.animate-blink')).toBeNull();
  });

  it('shows a blinking cursor while a field is mid-typing', () => {
    mockUseTypingEffect.mockImplementation((text: string) => ({
      displayedText: text.slice(0, 3),
      isTyping: true,
    }));
    render(<ProductMockup />);
    expect(document.querySelectorAll('.animate-blink').length).toBeGreaterThan(0);
  });

  it('does not crash when a field is empty (typing not started yet)', () => {
    mockUseTypingEffect.mockReturnValue({ displayedText: '', isTyping: false });
    expect(() => render(<ProductMockup />)).not.toThrow();
  });
});
