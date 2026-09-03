/**
 * __tests__/components/ui/PageHeader.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '@/components/ui/PageHeader';

describe('PageHeader component', () => {
  it('renders the title, an optional breadcrumb, and an actions slot', () => {
    render(
      <PageHeader
        title="Responses"
        breadcrumb={[{ label: 'Forms', href: '/forms' }, { label: 'Responses' }]}
        actions={<button>Export</button>}
      />
    );
    expect(screen.getByRole('heading', { name: 'Responses' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forms' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('omits the breadcrumb nav when none is given', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.queryByLabelText('Breadcrumb')).not.toBeInTheDocument();
  });
});
