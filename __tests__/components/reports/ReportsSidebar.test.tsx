import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportsSidebar } from '@/components/reports/ReportsSidebar';

describe('ReportsSidebar', () => {
  it('links personal scope to /insights', () => {
    render(<ReportsSidebar />);
    expect(screen.getByRole('link', { name: /Go to Insights/ })).toHaveAttribute('href', '/insights');
  });

  it('links a workspace scope to its own insights', () => {
    render(<ReportsSidebar scope="acme" />);
    expect(screen.getByRole('link', { name: /Go to Insights/ })).toHaveAttribute('href', '/w/acme/insights');
  });

  it('lists the quick tips under headings', () => {
    render(<ReportsSidebar />);
    expect(screen.getByRole('heading', { name: 'Need more insights?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Quick Tips' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText(/generated in the background/)).toBeInTheDocument();
  });
});
