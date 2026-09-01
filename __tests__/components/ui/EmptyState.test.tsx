/**
 * __tests__/components/ui/EmptyState.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/ui/EmptyState';

describe('EmptyState component', () => {
  it('renders the title, and omits description/actions when not given', () => {
    render(<EmptyState title="No forms yet" />);
    expect(screen.getByText('No forms yet')).toBeInTheDocument();
  });

  it('renders description and actions when given', () => {
    render(
      <EmptyState
        title="No forms yet"
        description="Create your first form to get started."
        actions={<button>Create form</button>}
      />
    );
    expect(screen.getByText('Create your first form to get started.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create form' })).toBeInTheDocument();
  });
});
