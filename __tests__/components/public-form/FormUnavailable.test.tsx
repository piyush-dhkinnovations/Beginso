/**
 * Feature: sprint-3-public-form
 * Tests for FormUnavailable — lock icon, heading, sub-message, optional userNote.
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

  it('renders userNote when provided', () => {
    render(<FormUnavailable userNote="Thanks for stopping by." />);
    expect(screen.getByText('Thanks for stopping by.')).toBeInTheDocument();
  });

  it('does not render a userNote paragraph when omitted', () => {
    render(<FormUnavailable />);
    expect(screen.queryByText('Thanks for stopping by.')).not.toBeInTheDocument();
  });

  // QA A5-001: closed, past its closing date and full all used to read exactly like a link that never existed.
  it.each([
    ['closed', 'This form is closed'],
    ['closeDate', "This form's closing date has passed"],
    ['limit', 'This form has reached its response limit'],
  ] as const)('says why for the %s state', (reason, heading) => {
    render(<FormUnavailable reason={reason} />);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.queryByText('Form not found')).not.toBeInTheDocument();
  });

  it('keeps one wording for a link that resolves to nothing (a draft must look the same as an unknown link)', () => {
    render(<FormUnavailable notFound />);
    expect(screen.getByRole('heading', { level: 1, name: 'Form not found' })).toBeInTheDocument();
  });

  it('is a main landmark, so a screen reader can jump to it', () => {
    render(<FormUnavailable reason="closed" />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
