/**
 * __tests__/components/ui/Textarea.test.tsx
 * Feature: sprint-7-foundation
 * Tests: Textarea — renders label, shows error, forwards ref
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Textarea } from '@/components/ui/Textarea';

describe('Textarea component', () => {
  it('renders with a label', () => {
    render(<Textarea id="bio" label="Bio" />);
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
  });

  it('shows error message in a role="alert" element and marks aria-invalid', () => {
    render(<Textarea id="bio" error="Too long" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Too long');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('applies the beginso-ui.css textarea class', () => {
    render(<Textarea id="bio" />);
    expect(screen.getByRole('textbox').className).toMatch(/\bbg-textarea\b/);
  });

  it('forwards a ref to the underlying textarea element', () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<Textarea id="bio" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });
});
