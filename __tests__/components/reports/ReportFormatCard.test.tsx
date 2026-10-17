/**
 * __tests__/components/reports/ReportFormatCard.test.tsx
 * Feature: sprint-5-analytics-reports
 * Tests: ReportFormatCard — renders title/description, Generate fires onGenerate,
 * isLoading/disabled states
 * Requirements: 10.1, 10.2, 10.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportFormatCard } from '@/components/reports/ReportFormatCard';

describe('ReportFormatCard', () => {
  it('renders the title and description', () => {
    render(
      <ReportFormatCard
        format="csv"
        title="CSV Export"
        description="A spreadsheet-friendly file with every answer."
        onGenerate={vi.fn()}
        isLoading={false}
      />
    );
    expect(screen.getByText('CSV Export')).toBeInTheDocument();
    expect(screen.getByText('A spreadsheet-friendly file with every answer.')).toBeInTheDocument();
  });

  it('fires onGenerate when Generate is clicked', () => {
    const onGenerate = vi.fn();
    render(<ReportFormatCard format="pdf" title="PDF Report" description="desc" onGenerate={onGenerate} isLoading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /^Generate/ }));

    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('disables the button while isLoading', () => {
    render(<ReportFormatCard format="csv" title="CSV Export" description="desc" onGenerate={vi.fn()} isLoading />);
    expect(screen.getByRole('button', { name: /Generate/ })).toBeDisabled();
  });

  it('disables the button when disabled is set, independent of isLoading', () => {
    render(<ReportFormatCard format="csv" title="CSV Export" description="desc" onGenerate={vi.fn()} isLoading={false} disabled />);
    expect(screen.getByRole('button', { name: /^Generate/ })).toBeDisabled();
  });
});

describe('ReportFormatCard badge (QA A13-009)', () => {
  it('draws the 10px format label in primary text, not the tinted tone ink that failed the contrast check', () => {
    render(<ReportFormatCard format="csv" title="CSV Export" description="d" onGenerate={vi.fn()} isLoading={false} />);
    expect(screen.getByText('CSV').className).toMatch(/text-\(--text-primary\)/);
  });
});
