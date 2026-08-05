/**
 * __tests__/components/responses/AnswerBlock.test.tsx
 * Feature: sprint-4-responses
 * Tests: AnswerBlock — null/string/array value rendering, given a flat label→value answer
 * (the real backend contract has no per-answer fieldId/fieldType — see
 * docs/backend-contract/api-reference.md §3)
 * Requirements: 4.3, 4.4
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnswerBlock } from '@/components/responses/AnswerBlock';

describe('AnswerBlock', () => {
  it('renders the label and a string value', () => {
    render(<AnswerBlock label="Full Name" value="Priya Sharma" />);
    expect(screen.getByText('Full Name')).toBeInTheDocument();
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
  });

  it('renders "—" for a null value', () => {
    render(<AnswerBlock label="Middle Name" value={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders "—" for an empty string value', () => {
    render(<AnswerBlock label="Nickname" value="" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders a comma-joined list for an array value (checkbox)', () => {
    render(<AnswerBlock label="Topics" value={['Design', 'Dev']} />);
    expect(screen.getByText('Design, Dev')).toBeInTheDocument();
  });

  it('renders a numeric value as text', () => {
    render(<AnswerBlock label="Years of Experience" value={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
