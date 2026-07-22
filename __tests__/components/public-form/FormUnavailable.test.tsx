/**
 * Feature: sprint-3-public-form
 * Tests for FormUnavailable — lock icon, heading, sub-message, optional adminNote.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormUnavailable } from '@/components/public-form/FormUnavailable';

describe('FormUnavailable', () => {
  it('renders the heading and sub-message', () => {
    render(<FormUnavailable />);
    expect(
      screen.getByText('This form is not currently accepting responses.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('If you believe this is an error, please contact the form owner.')
    ).toBeInTheDocument();
  });

  it('renders adminNote when provided', () => {
    render(<FormUnavailable adminNote="Thanks for stopping by." />);
    expect(screen.getByText('Thanks for stopping by.')).toBeInTheDocument();
  });

  it('does not render an adminNote paragraph when omitted', () => {
    render(<FormUnavailable />);
    expect(screen.queryByText('Thanks for stopping by.')).not.toBeInTheDocument();
  });
});
